
import Statistics from './Statistics'
import {execShellCommand} from './utils'
import {spawn} from 'child_process'
import prettyMilliseconds from 'pretty-ms'
import { Socket } from 'socket.io'
import DB from './Database';
import User from '../types';
import {promises as fs} from 'fs'

const UPDATE_INTERVAL: number = ( parseInt(process.env.STAT_UPDATE_INTERVAL_SECONDS) || 30 ) * 1000;

export interface RenderOptions {
    useGPU?: boolean,
    python_scripts?: string[],
    frames?: string[],
}

interface LogObject {
    timestamp: number,
    text: string
}

type StopReason = "CANCELLED" | "OUT_OF_TOKENS" | "ERROR"

export default class RenderController {
    active: boolean = false;
    current_frame: number = 0;
    max_frames: number = 0;
    #started: number = null;
    all_frames: boolean | number = false;
    blend: string

    #logs: LogObject[] = [];
    #process: any
    #startedByUsername: string;
    #last_stats
    #stopReason: StopReason
    #previousRender: any

    #io = null
    #statsTimer: NodeJS.Timeout
    #tokenTimer: NodeJS.Timeout
    #db: DB
    constructor(io: Socket, db: DB) {
        this.#io = io;
        this.#db = db;
        fs.readFile('../../render.lock')
        .then(data => {
            console.info('Found existing render.lock: ', data)
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
            this.blend = blend;
            this.#startedByUsername = user.username;
            const render_prefix = options.useGPU ? "./renderGPU.sh" : "./renderCPU.sh"
            const py_scripts = options.python_scripts||[].map(v => `-P "${v}"`);
            if(!options.frames) {
                this.all_frames = true;
                //Find the maximum amount of frames
                try {
                    const scriptResponse: string = await execShellCommand(`python3 python_scripts/blend_render_info.py "blends/${blend}"`,{
                        cwd:process.env.HOME_DIR
                    })
                    const csv = scriptResponse.trim().split(" ");
                    this.max_frames = parseInt(csv[1]);
                    this.current_frame = 0;
                }catch(err) {
                    console.error('[renderStart] Finding frame count of blend file failed:', err.message)
                    return reject(err)
                }
            }else{
                this.all_frames = 0;
                if(Array.isArray(options.frames) && options.frames.length !== 2) {
                    return reject(new Error('Invalid frame specification. Please provide array of start and end frame or null for all'))
                }
                this.current_frame = parseInt(options.frames[0])
                this.max_frames = parseInt(options.frames[1])
            }
            const frame_string = this.all_frames? 'all': this.current_frame + " " + this.all_frames? 'all': this.max_frames
            console.log(`[renderStart] mode=${options.useGPU?'gpu':'cpu'} blend="${blend}" frames=${frame_string} ${py_scripts.join(" ")}`);
            try {
                const args: string[] = [
                    `"${blend}"`,
                    this.all_frames ? 'all' : this.current_frame.toString(),
                    this.all_frames ? 'all' : this.max_frames.toString()
                    //data.extra_args
                ].concat(py_scripts)
                this.#previousRender = null;
                this.#stopReason = null;
                const tokens = user.tokens || 0;
                if(tokens != -1 && user.permissions !== 99) {
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

                const renderProcess = spawn(render_prefix, args, {
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
                    const frame_match = msg.match(/(Saved:)(.*\/)(\d+.png)/)
                    if(frame_match && frame_match.length == 4) {
                        const frame = parseInt(frame_match[3]);
                        this.emit('frame', frame);
                        this.current_frame = frame + 1;
                        //get frame #
                    }
                    if(!this.active) {
                        this.emit('render_start', this.getStatus())
                        resolve(this.getStatus())
                        this.active = true;
                        this.#started = Date.now();
                    }
                    this.pushLog(msg)
                })
                renderProcess.stderr.on('data',data => {
                    if(!this.active) {
                        this.emit('render_start', this.getStatus())
                        resolve(this.getStatus())
                        this.active = true;
                        this.#started = Date.now();
                    }
                    this.pushLog(data.toString())
                })
                renderProcess
                .on('exit', () => {
                    const time_taken = prettyMilliseconds(Date.now() - this.#started);
                    this.emit('render_stop', {
                        started: this.#started,
                        time_taken,
                        blend: this.blend
                    })
                    this.#previousRender = {
                        blend: this.blend,
                        reason: this.#stopReason,
                        time_taken,
                        started: this.#started,
                        startedByID: this.#startedByUsername
                    }
                    clearInterval(this.#tokenTimer);
                    //clear buffer logs
                    this.#logs = []
                    this.active = false
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
    pushLog(text: string): void {
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
    async cancelRender(reason?: StopReason): Promise<void> {
        if(this.active) {
            this.#stopReason = reason || "CANCELLED";
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

    isRenderActive() {
        return this.active;
    }
    
    getStatus() {
        const time_taken = prettyMilliseconds(Date.now() - this.#started);
        return {
            active: this.active,
            max_frames: this.max_frames,
            current_frame: this.current_frame,
            blend: this.blend,
            startedByID: this.#startedByUsername,
            duration: this.active ? {
                formatted: time_taken,
                raw: Date.now() - this.#started,
                started: this.#started
            } : null,
            lastRender: this.#previousRender
        }
}
    getStatistics() {
        return this.#last_stats;
    }
    
    getLogs() {
        return this.#logs
    }

    emit(name: string, object: any) {
        for(const socketId in this.#io.sockets.sockets) {
            const socket = this.#io.sockets.sockets[socketId];
            if(socket.authorized) {
                socket.emit(name, object)
            }
        }
    }
}
