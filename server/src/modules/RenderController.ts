
import Statistics from './Statistics'
import { execCombinedPromise, execPromise } from './utils'
import { ChildProcessByStdio, exec, spawn } from 'child_process'
import prettyMilliseconds from 'pretty-ms'
import { Socket } from 'socket.io'
import DB, { ActionType } from './Database';
import { User } from '../ts/interfaces/RenderController_interfaces.js'
import {promises as fs} from 'fs'
import { Render, StoppedRender, RenderOptions } from '../ts/interfaces/RenderController_interfaces.js'
import { ServerStats, LogObject } from '../ts/interfaces/Statistics_interfaces.js'
import { tmpdir } from 'os'
import path from 'path'
import internal from 'stream'

const UPDATE_INTERVAL: number = ( parseInt(process.env.STAT_UPDATE_INTERVAL_SECONDS) || 30 ) * 1000;
const MAX_FRAMETIME_COUNT = 20;

const BLENDER_PATH = process.env.BLENDER_PATH ?? "blender"

interface LockData {
    pid: number,
    data: RenderStatus
}

interface RenderStatus {
    render: Render,
    active: boolean,
    duration?: {
        formatted: string,
        raw: number
        started: number
    },
    eta: number,
    averageTimePerFrame: number,
    lastRender?: Render
}

export default class RenderController {
    active: boolean = false;
    #render: Render = null

    #frameTimes: FrameDuration[] = []
    #lastFrameTime: FrameDuration

    #logs: LogObject[] = [];
    #process: any
    #last_stats: ServerStats
    #stopReason: StopReason
    #previousRender: StoppedRender

    #io = null
    #statsTimer: NodeJS.Timeout
    #tokenTimer: NodeJS.Timeout
    #db: DB

    #blenderVersion: string

    constructor(io: Socket, db: DB) {
        this.#io = io;
        this.#db = db;
    }

    async initalize() {
        console.debug("Checking lock data")
        const lockData = await this.getLockData()
        if(lockData) {
            console.info(`Found an existing render.lock: pid=${lockData.pid}`)
            console.info(lockData.data)
            await this.cleanup()
        }
        await this.startTimer()
        await this.fetchBlenderVersion()
        console.log("[RenderController] Initalized & ready")
    }

    private async fetchBlenderVersion() {
        const out = await execPromise(`"${BLENDER_PATH}" -b --version`)
        const match = out.stdout.match(/Blender ((\d+).(\d+).(\d)+)/)
        if(match) {
            this.#blenderVersion = match[1]
            console.info("Blender Version:", this.#blenderVersion)
        } else {
            console.error("Could not get blender version.\n", out.stderr)
        }
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
    private async startTimer(): Promise<void> {
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
            console.error("[ERROR] Statistics have been disabled due to an error:\n", err.message)
            clearInterval(this.#statsTimer);
        }
    }
    get eventEmitter() {
        return this.#io
    }
    get db() {
        return this.#db;
    }
    async startRender(blend: string, user: User, options: RenderOptions = {}) {
        // if(process.platform === "win32") return reject(new Error('Renders cannot be started on windows machines. Sorry.'))
        if(!blend) throw new Error('Missing blend property')
        let allFrames: boolean, render: Partial<Render> = {
            blend,
            user
        }

        const renderPrefix = options.useGPU ? "./renderGPU.sh" : "./renderCPU.sh"
        const pythonScripts = options.python_scripts||[].map(v => `-P "${v}"`);
        if(!options.frames) {
            allFrames = true;
            //Find the maximum amount of frames
            try {
                const scriptResponse: string = await execCombinedPromise(`python3 python_scripts/blend_render_info.py "blends/${blend}"`,{
                    cwd:process.env.HOME_DIR
                })
                const csv = scriptResponse.trim().split(" ");
                render.maximumFrames = parseInt(csv[1]);
                render.currentFrame = 0;
            }catch(err) {
                console.error('[renderStart] Finding frame count of blend file failed:', err.message)
                throw err
            }
        } else {
            allFrames = false
            if(Array.isArray(options.frames) && options.frames.length !== 2) {
                throw new Error('Invalid frame specification. Please provide array of start and end frame or null for all')
            }
            render.currentFrame = parseInt(options.frames[0])
            render.maximumFrames = parseInt(options.frames[1])
        }
        render.startFrame = render.currentFrame
        const frameString = allFrames ? 'all': (`${render.currentFrame}..${render.maximumFrames}`)
        console.log(`[renderStart] mode=${renderPrefix} blend="${blend}" frames=${frameString} ${pythonScripts.join(" ")}`);
        this.#previousRender = null;
        this.#stopReason = null;
        //FIXME: Seems to be failing even with unlimited tokens
        if(user.permissions !== 99 && !user.permissionBits?.includes(255)) {
            if(!user.tokens) user.tokens = 0;
            this.#tokenTimer = setInterval(() => {
                if(user.tokens <= 0) {
                    this.cancelRender("OUT_OF_TOKENS");
                    user.tokens = 0;
                    clearInterval(this.#tokenTimer)
                } else {
                    user.tokens--;
                    this.#db.users.update(user);
                }
            }, 1000 * 60 * 10);
        }
        const renderProcess = await this.spawn(blend, options, render)
        await this.setLock({
            pid: renderProcess.pid,
            data: this.getStatus()
        })
        this.#process = renderProcess;
    }

    private async spawn(blendFile: string, options: RenderOptions, render: Partial<Render>) : Promise<ChildProcessByStdio<null, internal.Readable, internal.Readable>> {
        return new Promise((resolve, reject) => {
            const args = [
                `blends/${blendFile}`,
                '-b',
                '-noaudio',
                `--render-output`, path.join(process.env.HOME_DIR, "tmp/"),
                '-P', 'python_scripts/settings.py',
                '-y'
            ]
    
            // if(options.frames !== null) {
            //     args.push('-a')
            // } else {
            //     args.push('--render-frame', `${options.frames[0]}..${options.frames[1]}`)
            // }
            args.push('--render-frame', `${render.startFrame}..${render.maximumFrames}`)
    
            if(options.useGPU) {
                args.push('-E', 'CYCLES')
                args.push('-P', 'python_scripts/render_gpu.py')
            }
    
            if(options.python_scripts) {
                for(const script of options.python_scripts) {
                    args.push('-P', script)
                }
            }

            if(options.renderQuality) {
                args.push('--python-expr', `bpy.data.scenes[0].render.resolution_percentage = ${options.renderQuality}`)
            }
            //blender -b "$blend_file" -noaudio --render-output "/home/ezra/tmp/" -E CYCLES -P python_scripts/settings.py -P python_scripts/render_gpu.py -y ${framearg} > >(tee logs/blender.log) 2> >(tee logs/blender_errors.log >&2) &
            const renderProcess = spawn(BLENDER_PATH, args, {
                cwd: path.resolve(process.env.HOME_DIR),
                stdio: ['ignore', 'pipe', 'pipe']
            }).on('error', err => {
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
                        startFrame: render.startFrame,
                        started: Date.now(),
                        user: render.user
                    }
                    this.emit('render_start', this.getStatus())
                    this.active = true;
                    
                }
                const frameMatch = msg.match(/Saved: .*[\\\/]((\d+).png)/) //Saved: .*[\\\/]((\d+).png)' Time: (\d+:\d+\.\d+)
                if(frameMatch && frameMatch.length == 3) {
                    // We start on frame 0, and once frame 0 is done, first frame is done, so + 1 as it's 0-indexed
                    const frame = parseInt(frameMatch[2]) + 1;
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
                    }
                    this.#lastFrameTime = Date.now()
                    //get frame #
                }
                this.pushLog(msg)
            })
            renderProcess.stderr.on('data',data => {
                if(!this.active) {
                    this.#render.started = Date.now();
                    this.emit('render_start', this.getStatus())
                    this.active = true;
                }
                this.pushLog(data.toString())
            })
            renderProcess
            .on('exit', async () => {
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
                clearInterval(this.#tokenTimer);
                await this.cleanup()
            });
            resolve(renderProcess)
        })
    }

    async cancelRender(reason: StopReason = "CANCELLED", user?: User): Promise<void> {
        if(this.active) {
            //Don't need to cleanup this.#render, as exit event will clean it up after SIGTERM is called.
            this.#stopReason = reason
            if(user) {
                this.#db.logAction(user, ActionType.CANCEL_RENDER, reason, this.#render.blend, this.#render.user.username)
            }
            this.#process.kill('SIGTERM')
            await this.cleanup()
            return null;
        }else{
            throw new Error('Render is not active.')
        }
    }
    
    private async cleanup() {
        const tmpFolder = path.join(process.env.HOME_DIR, "tmp")
        // This will also clear the render.lock
        await fs.rm(tmpFolder, { recursive: true, force: true })
        await fs.mkdir(tmpFolder).catch(err => {})
    }

    private async getLockData(): Promise<LockData> {
        const tmpFolder = path.join(process.env.HOME_DIR, "tmp")
        try {
            const data = await fs.readFile(path.join(tmpFolder, "render.lock"))
            return JSON.parse(data.toString()) as LockData
        } catch(err) {
            if(err.code === 'ENOENT')
                return null
            else
                throw err
        }
    }

    private async setLock(obj: LockData) {
        const tmpFolder = path.join(process.env.HOME_DIR, "tmp")
        const lockPath = path.join(tmpFolder, "render.lock")
        if(obj === null) {
            return fs.rm(lockPath)
        } else {
            return fs.writeFile(lockPath, JSON.stringify(obj))
        }
    }
    
    getStatus() {
        const timeTaken = this.active ? prettyMilliseconds(Date.now() - this.#render.started) : null;
        return {
            render: this.#render,
            active: this.active,
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
