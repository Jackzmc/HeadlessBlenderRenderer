
import Statistics from './Statistics'
import {execShellCommand} from './utils'
import {spawn} from 'child_process'
import prettyMilliseconds from 'pretty-ms'

const UPDATE_INTERVAL: number = ( parseInt(process.env.STAT_UPDATE_INTERVAL_SECONDS)||30 ) * 1000;

export interface RenderOptions {
    useGPU?: boolean,
    python_scripts?: string[],
    frames?: string[],
}

interface LogObject {
    timestamp: number,
    message: string
}

export default class RenderController {
    active: boolean = false;
    current_frame: number = 0;
    max_frames: number = 0;
    started: number = null;
    all_frames: boolean | number = false;
    logs: LogObject[] = [];
    io = null
    blend: string
    process: any
    last_stats
    #timer: NodeJS.Timeout
    constructor(io) {
        this.io = io;
        this.startTimer();
    }
    getEventEmitter() {
        return this.io
    }
    startRender(blend: string, options: RenderOptions = {}) {
        return new Promise(async(resolve,reject) => {
            if(process.platform === "win32") reject(new Error('Renders cannot be started on windows machines. Sorry.'))
            if(!blend) return reject(new Error('Missing blend property'))
            this.blend = blend;
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
                const renderProcess = spawn(render_prefix, args, {
                    cwd: process.env.HOME_DIR,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                .on('error', err => {
                    console.error('[RenderController] ERROR:', err.message)
                    const logObject = {
                        message: err.message,
                        timestamp: Date.now()
                    }
                    this.emit('log', logObject)
                    this.logs.push(logObject)
                    if(this.logs.length >= 50) {
                        this.logs.splice(0, this.logs.length - 50)
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
                        this.emit('render_start', this.getSettings())
                        resolve(this.getSettings())
                        this.active = true;
                        this.started = Date.now();
                    }
                    this.pushLog(msg)
                })
                renderProcess.stderr.on('data',data => {
                    if(!this.active) {
                        this.emit('render_start', this.getSettings())
                        resolve(this.getSettings())
                        this.active = true;
                        this.started = Date.now();
                    }
                    this.pushLog(data.toString())
                })
                renderProcess
                .on('exit', () => {
                    const time_taken = prettyMilliseconds(Date.now() - this.started);
                    this.emit('render_stop', {
                        started: this.started,
                        time_taken,
                        blend: this.blend
                    })
                    //clear buffer logs
                    this.logs = []
                    this.active = false
                });
                this.process = renderProcess;
            }catch(err) {
                reject(err)
            }
        })
        
    }
    pushLog(message: string): void {
        const logObject: LogObject = {
            message,
            timestamp: Date.now()
        }
        this.emit('log', logObject)
        this.logs.push(logObject)
        if(this.logs.length >= 50) {
            this.logs.splice(0, this.logs.length - 50)
        }
    }
    async cancelRender(): Promise<void> {
        if(this.active) {
            this.process.kill('SIGTERM')
            return null;
        }else{
            throw new Error('Render is not active.')
        }
    }
    startTimer(): void {
        console.info('[RenderController] Starting statistics timer, running every', UPDATE_INTERVAL, "ms")
        Statistics().then(stats => {
            this.last_stats = stats;
            this.emit('stat', stats)
        })
        this.#timer = setInterval(() => {
            Statistics().then(stats => {
                this.last_stats = stats;
                this.emit('stat', stats)
            })
        }, UPDATE_INTERVAL)
    }

    isRenderActive() {
        return this.active;
    }
    
    getSettings() {
        const time_taken = prettyMilliseconds(Date.now() - this.started);
        return {
            active: this.active,
            max_frames: this.max_frames,
            current_frame: this.current_frame,
            blend: this.blend,
            duration: this.active ? {
                formatted: time_taken,
                raw: Date.now() - this.started,
                started: this.started
            } : null
        }
    }
    getStatistics() {
        return this.last_stats;
    }
    
    getLogs() {
        return this.logs
    }

    emit(name: string, object: any) {
        for(const socketId in this.io.sockets.sockets) {
            const socket = this.io.sockets.sockets[socketId];
            if(socket.authorized) {
                socket.emit(name, object)
            }
        }
    }
}
