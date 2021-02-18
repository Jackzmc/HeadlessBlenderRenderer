
import Statistics from './Statistics'
import {execShellCommand} from './utils'
import {spawn} from 'child_process'
import prettyMilliseconds from 'pretty-ms'
import { Socket } from 'socket.io'
import DB, { ActionType } from './Database';
import User from '../types';
import {promises as fs} from 'fs'

const UPDATE_INTERVAL: number = ( parseInt(process.env.STAT_UPDATE_INTERVAL_SECONDS) || 30 ) * 1000;
const MAX_FRAMETIME_COUNT = 20;

export interface RenderOptions {
    useGPU?: boolean,
    python_scripts?: string[],
    frames?: string[],
}

export interface Render {
    currentFrame: number;
    maximumFrames: number;
    started: number;
    blend: string,
    startedById: string,
}

type FrameDuration = number

export interface StoppedRender extends Render {
    reason: StopReason,
    timeTaken: string
}

interface LogObject {
    timestamp: number,
    text: string
}

type StopReason = "CANCELLED" | "OUT_OF_TOKENS" | "ERROR"
type EventName = "render_start" | "render_stop" | "frame" | "log" | "stat"

export default class RenderController {
    active: boolean = false;
    #render: Render = null

    #frameTimes: FrameDuration[] = []
    #lastFrameTime: FrameDuration

    #logs: LogObject[] = [];
    #process: any
    #startedByUsername: string;
    #last_stats
    #stopReason: StopReason
    #previousRender: StoppedRender

    #io = null
    #statsTimer: NodeJS.Timeout
    #tokenTimer: NodeJS.Timeout
    #db: DB
    constructor(io: Socket, db: DB) {
        this.#io = io;
        this.#db = db;
        fs.readFile('../../render.lock')
        .then(data => {
            console.info('Found existing render.lock: ', data.toString())
            fs.unlink('../../render.lock')
        }).catch(() => {})

        this.startTimer();
    }
    getEventEmitter() {
        return this.#io
    }
    getDatabase() {
        return this.#db;
    }
    startRender(blend: string, user: User, options: RenderOptions = {}) {
        return new Promise(async(resolve,reject) => {
            if(process.platform === "win32") reject(new Error('Renders cannot be started on windows machines. Sorry.'))
            if(!blend) return reject(new Error('Missing blend property'))
            let allFrames: boolean, render: Partial<Render> = {
                blend,
            }

            const renderPrefix = options.useGPU ? "./renderGPU.sh" : "./renderCPU.sh"
            const pythonScripts = options.python_scripts||[].map(v => `-P "${v}"`);
            if(!options.frames) {
                allFrames = true;
                //Find the maximum amount of frames
                try {
                    const scriptResponse: string = await execShellCommand(`python3 python_scripts/blend_render_info.py "blends/${blend}"`,{
                        cwd:process.env.HOME_DIR
                    })
                    const csv = scriptResponse.trim().split(" ");
                    render.maximumFrames = parseInt(csv[1]);
                    render.currentFrame = 0;
                }catch(err) {
                    console.error('[renderStart] Finding frame count of blend file failed:', err.message)
                    return reject(err)
                }
            }else{
                allFrames = false
                if(Array.isArray(options.frames) && options.frames.length !== 2) {
                    return reject(new Error('Invalid frame specification. Please provide array of start and end frame or null for all'))
                }
                render.currentFrame =  parseInt(options.frames[0])
                render.maximumFrames = parseInt(options.frames[1])
            }
            const frameString = allFrames ? 'all': (`${render.currentFrame}..${render.maximumFrames}`)
            console.log(`[renderStart] mode=${renderPrefix} blend="${blend}" frames=${frameString} ${pythonScripts.join(" ")}`);
            try {
                const args: string[] = [
                    `"${blend}"`,
                    allFrames ? 'all' : render.currentFrame.toString(),
                    allFrames ? 'all' : render.maximumFrames.toString()
                    //data.extra_args
                ].concat(pythonScripts)
                this.#previousRender = null;
                this.#stopReason = null;
                //FIXME: Seems to be failing even with unlimited tokens
                if(user.permissions !== 99 && !user.permissionBits?.includes(255)) {
                    if(!user.tokens) user.tokens = 0;
                    this.#tokenTimer = setInterval(() => {
                        if(user.tokens <= 0) {
                            this.cancelRender("OUT_OF_TOKENS");
                            clearInterval(this.#tokenTimer)
                        }else{
                            user.tokens--;
                            this.#db.users.update(user);
                        }
                    }, 1000 * 60 * 10);
                }
                const renderProcess = spawn(renderPrefix, args, {
                    cwd: process.env.HOME_DIR,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                .on('error', err => {
                    console.error('[RenderController] ERROR:', err.message)
                    const logObject = {
                        text: err.message,
                        timestamp: Date.now()
                    }
                    this.emit('log', logObject)
                    this.#logs.push(logObject)
                    if(this.#logs.length >= 50) {
                        this.#logs.splice(0, this.#logs.length - 50)
                    }
                    return reject(err)
                })
                renderProcess.stdout.on('data',(data) => {
                    const msg = data.toString();
                    if(!this.active) {
                        this.#render = {
                            blend: render.blend,
                            currentFrame: render.currentFrame,
                            maximumFrames: render.maximumFrames,
                            started: Date.now(),
                            startedById: user.username,
                        }
                        this.emit('render_start', this.getStatus())
                        resolve(this.getStatus())
                        this.active = true;
                        
                    }
                    const frameMatch = msg.match(/(Saved:)(.*\/)(\d+.png)/)
                    if(frameMatch && frameMatch.length == 4) {
                        const frame = parseInt(frameMatch[3]);
                        this.emit('frame', {
                            frame,
                            eta: this.eta,
                            averageTimePerFrame: this.averageTimePerFrame
                        });
                        this.#render.currentFrame = frame + 1;

                        if(this.#lastFrameTime > 0) {
                            const difference = Date.now() - this.#lastFrameTime;
                            this.#frameTimes.push(difference)
                            if(this.#frameTimes.length > MAX_FRAMETIME_COUNT) {
                                this.#frameTimes.shift()
                            }
                        }else{
                            this.#lastFrameTime = Date.now()
                        }
                        //get frame #
                    }
                    this.pushLog(msg)
                })
                renderProcess.stderr.on('data',data => {
                    if(!this.active) {
                        this.#render.started = Date.now();
                        this.emit('render_start', this.getStatus())
                        resolve(this.getStatus())
                        this.active = true;
                    }
                    this.pushLog(data.toString())
                })
                renderProcess
                .on('exit', () => {
                    const timeTaken = prettyMilliseconds(Date.now() - this.#render.started);
                    this.#previousRender = {
                        ...this.#render,
                        timeTaken,
                        reason: this.#stopReason
                    }
                    this.emit('render_stop', this.#previousRender)
                    this.#render = null;
                    this.#logs = []
                    this.#frameTimes = []
                    this.#lastFrameTime = 0;
                    this.active = false
                    fs.unlink('../../render.lock')
                    clearInterval(this.#tokenTimer);
                });
                fs.writeFile('../../render.lock', JSON.stringify({
                    pid: process.pid,
                    rend: this.getStatus()
                }), 'utf-8')
                .catch(err => console.warn('[render] warn: failed to create render.lock file: \n',err))
                this.#process = renderProcess;
            }catch(err) {
                reject(err)
            }
        })
        
    }
    private pushLog(text: string): void {
        const logObject: LogObject = {
            text,
            timestamp: Date.now()
        }
        this.emit('log', logObject)
        this.#logs.push(logObject)
        if(this.#logs.length >= 50) {
            this.#logs.splice(0, this.#logs.length - 50)
        }
    }
    async cancelRender(reason: StopReason = "CANCELLED", user?: User): Promise<void> {
        if(this.active) {
            //Don't need to cleanup this.#render, as exit event will clean it up after SIGTERM is called.
            this.#stopReason = reason
            if(user) {
                this.#db.logAction(user, ActionType.CANCEL_RENDER, reason, this.#render.blend, this.#render.startedById)
            }
            this.#process.kill('SIGTERM')
            return null;
        }else{
            throw new Error('Render is not active.')
        }
    }
    async startTimer(): Promise<void> {
        try {
            const stats = await Statistics()
            this.#last_stats = stats;
            this.emit('stat', stats)
            console.info('[RenderController] Starting statistics timer, running every', UPDATE_INTERVAL, "ms")
            this.#statsTimer = setInterval(() => {
                Statistics().then(stats => {
                    this.#last_stats = stats;
                    this.emit('stat', stats)
                })
            }, UPDATE_INTERVAL)
        }
        catch(err) {
            console.error("[ERROR] Statistics have been disabled due to an error.\n", err.message)
            clearInterval(this.#statsTimer);
        }
    }
    
    getStatus() {
        const timeTaken = this.active ? prettyMilliseconds(Date.now() - this.#render.started) : null;
        return {
            render: this.#render,
            duration: this.active ? {
                formatted: timeTaken,
                raw: Date.now() - this.#render.started,
                started: this.#render.started
            } : null,
            eta: this.eta,
            averageTimePerFrame: this.averageTimePerFrame,
            lastRender: this.#previousRender
        }
    }

    private emit(name: EventName, object: any) {
        for(const socketId in this.#io.sockets.sockets) {
            const socket = this.#io.sockets.sockets[socketId];
            if(socket.authorized) {
                socket.emit(name, object)
            }
        }
    }

    get eta() {
        if(this.active)
            return this.averageTimePerFrame * (this.#render.maximumFrames - this.#render.currentFrame)
        else
            return 0
    }

    get averageTimePerFrame() {
        if(this.#frameTimes.length == 0) return 0;
        const sum = this.#frameTimes.reduce((a,b) => a+b, 0)
        return Math.round(sum / this.#frameTimes.length)
    }

    get logs() {
        return this.#logs
    }

    get statistics() {
        return this.#last_stats
    }
}
