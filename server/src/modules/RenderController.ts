
import Statistics from './Statistics'
import { execCombinedPromise, execPromise } from './utils'
import { ChildProcessByStdio, exec, spawn } from 'child_process'
import prettyMilliseconds from 'pretty-ms'
import { Socket } from 'socket.io'
import DB, { ActionType } from './Database';
import { User } from '../ts/interfaces/RenderController_interfaces.js'
import {createWriteStream, promises as fs, WriteStream} from 'fs'
import { Render, StoppedRender, RenderOptions } from '../ts/interfaces/RenderController_interfaces.js'
import { ServerStats, LogObject } from '../ts/interfaces/Statistics_interfaces.js'
import { tmpdir } from 'os'
import path from 'path'
import internal from 'stream'
import TreeKill from 'tree-kill'

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
    #logStream: WriteStream = null

    #frameTimes: FrameDuration[] = []
    #lastFrameTime: FrameDuration

    #logs: LogObject[] = [];
    #process: any
    #last_stats: ServerStats
    #stopReason: StopReason
    #previousRender: StoppedRender

    #io = null
    #statsTimer: NodeJS.Timeout = null
    #tokenTimer: NodeJS.Timeout
    #terminateTimer: NodeJS.Timeout
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
        const match = out.stdout.match(/Blender ((\d+).(\d+).?(\d)+)?/)
        if(match) {
            this.#blenderVersion = match[1]
            console.info("Blender Version:", this.#blenderVersion)
        } else {
            console.error("Could not get blender version:\n", out.stdout)
        }
    }

    private pushLog(text: string): void {
        const logObject: LogObject = {
            text,
            timestamp: Date.now()
        }
        this.#logStream.write(text)
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
            this.#statsTimer = null
        }
    }
    get eventEmitter() {
        return this.#io
    }
    get db() {
        return this.#db;
    }
    get statsAvailable() {
        return this.#statsTimer !== null
    }
    async startRender(blend: string, user: User, options: RenderOptions = {}) {
        // if(process.platform === "win32") return reject(new Error('Renders cannot be started on windows machines. Sorry.'))
        if(!blend) throw new Error('Missing blend property')

        const blendFilePath = path.join(process.env.HOME_DIR, "blends", blend)
        if(!await fs.stat(blendFilePath)) {
            throw new Error("Cannot find blend file: " + blendFilePath)
        }

        let render: Partial<Render> = {
            blend,
            user
        }
        if(options.renderQuality) options.renderQuality |= 0
        if(isNaN(options.renderQuality)) options.renderQuality = null

        render.startFrame = render.currentFrame = Number(options.frames[0])
        render.maximumFrames = Number(options.frames[1])
        if(isNaN(render.startFrame) || isNaN(render.maximumFrames)) {
            throw new Error("Frames array should be of integers")
        }

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
        const renderProcess = await this.spawn(blendFilePath, options, render)
        await this.setLock({
            pid: renderProcess.pid,
            data: this.getStatus()
        })
        this.#process = renderProcess;
    }

    private async spawn(blendPath: string, options: RenderOptions, render: Partial<Render>) : Promise<ChildProcessByStdio<null, internal.Readable, internal.Readable>> {
        const pythonScriptsParent = path.join(process.env.HOME_DIR, "python_scripts/")
        return new Promise((resolve, reject) => {
            clearTimeout(this.#terminateTimer)
            this.#terminateTimer = null
            const args = [
                '-b',
                `"${blendPath}"`,
                '-noaudio',
                `--render-output`, path.join(process.env.HOME_DIR, "tmp/"),
                // '-P', path.join(pythonScriptsParent, 'settings.py'),
                '--render-format', options.renderFormat ?? 'PNG',
                '--render-frame', `${render.startFrame}..${render.maximumFrames}`,
                '-y'
            ]
    
            // if(options.frames !== null) {
            //     args.push('-a')
            // } else {
            //     args.push('--render-frame', `${options.frames[0]}..${options.frames[1]}`)
            // }
    
            if(options.useGPU) {
                args.push('-E', 'CYCLES')
                args.push('-P', path.join(pythonScriptsParent, 'render_gpu.py'))
            }
    
            if(options.python_scripts) {
                for(const script of options.python_scripts) {
                    args.push('-P', path.join(pythonScriptsParent, path.normalize(script)))
                }
            }

            if(options.renderQuality && options.renderQuality !== 100) {
                args.push('--python-expr', `bpy.data.scenes[0].render.resolution_percentage = ${options.renderQuality}`)
            }

            args.push()

            const safeName = render.blend.replace(/\s/, '_').replace(/[^0-9A-Za-z]/g,'')
            this.#logStream = createWriteStream(path.join(process.env.HOME_DIR, "logs", `render-${safeName}-${Math.round(Date.now() / 1000)}.log`), 'utf-8')

            const renderProcess = spawn(BLENDER_PATH, args, {
                cwd: path.resolve(process.env.HOME_DIR),
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true
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
                    this.emit('render_start', { ... this.getStatus(), startedByName: render.user.username })
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
                if(msg === "Blender quit") this.cancelRender("ERROR")
                this.pushLog(msg)
            })
            renderProcess.stderr.on('data',data => {
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
                if(data === "Blender quit") this.cancelRender("ERROR")
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
                this.#logStream.close()
                this.#logStream = null
                clearInterval(this.#terminateTimer);
                this.#terminateTimer = null
                clearInterval(this.#tokenTimer);
                await this.cleanup()
            });
            resolve(renderProcess)
        })
    }

    cancelRender(reason: StopReason = "CANCELLED", user?: User): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if(this.active) {
                //Don't need to cleanup this.#render, as exit event will clean it up after SIGTERM is called.
                this.#stopReason = reason
                if(user) {
                    this.#db.logAction(user, ActionType.CANCEL_RENDER, reason, this.#render.blend, this.#render.user.username)
                }
                console.info("Render cancelled: " + reason)
                this.pushLog(`Render has been cancelled for reason "${reason}"`)
                TreeKill(this.#process.pid, 'SIGINT', (err) => {
                    if(err) reject(err)
                })
                this.#terminateTimer = setTimeout(() => {
                    this.#terminateTimer = null
                    TreeKill(this.#process.pid, (err) => {
                        if(err) reject(err)
                    })
                    this.#stopReason = "TERMINATED"
                    this.pushLog(`Render has been forcefully terminated`)
                    console.info("Render forcefully terminated")
                }, 1000 * 60)
                return resolve(true)
            }
            resolve(false)
        })
    }
    
    private async cleanup() {
        this.#logStream = null
        console.debug("Cleaning up...")
        const tmpFolder = path.join(process.env.HOME_DIR, "tmp")
        try {
            const filenames = await fs.readdir(tmpFolder)
            for(const filename of filenames) {
                await fs.rm(path.join(tmpFolder, filename), { recursive: true, force: true })
            }
        } catch(err) {
            if(err.code == "EACCES")
                console.error("[Error] Cannot cleanup tmp folder at " + tmpFolder)
            else
                throw err
        }

        await this.setLock(null)
    }

    private async getLockData(): Promise<LockData> {
        const folder = path.join(process.env.HOME_DIR)
        try {
            const data = await fs.readFile(path.join(folder, "render.lock"))
            return JSON.parse(data.toString()) as LockData
        } catch(err) {
            if(err.code === 'ENOENT')
                return null
            else if(err.code === 'EACCES') {
                console.warn("Warn: Cannot read render.lock due to missing permissions")
                return null
            }
            else
                throw err
        }
    }

    private async setLock(obj: LockData) {
        const lockPath = path.join(process.env.HOME_DIR, "render.lock")
        try {
            if(obj === null) {
                await fs.rm(lockPath, { force: true })
            } else {
                await fs.writeFile(lockPath, JSON.stringify(obj))
            }
        } catch(err) {
            if(err.code === "EACCES") {
                console.warn("Warn: Could not create render.lock due to missing permissions")
            } else {
                throw err
            }
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
        if(!this.#render) return 0
        if(this.#frameTimes.length == 0) return Date.now() - this.#render.started;
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
