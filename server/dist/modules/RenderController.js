"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _timer;
Object.defineProperty(exports, "__esModule", { value: true });
const Statistics_1 = __importDefault(require("./Statistics"));
const utils_1 = require("./utils");
const child_process_1 = require("child_process");
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const UPDATE_INTERVAL = (parseInt(process.env.STAT_UPDATE_INTERVAL_SECONDS) || 30) * 1000;
class RenderController {
    constructor(io) {
        this.active = false;
        this.current_frame = 0;
        this.max_frames = 0;
        this.started = null;
        this.all_frames = false;
        this.logs = [];
        this.io = null;
        _timer.set(this, void 0);
        this.io = io;
        this.startTimer();
    }
    getEventEmitter() {
        return this.io;
    }
    startRender(blend, options = {}) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (process.platform === "win32")
                reject(new Error('Renders cannot be started on windows machines. Sorry.'));
            if (!blend)
                return reject(new Error('Missing blend property'));
            this.blend = blend;
            const render_prefix = options.useGPU ? "./renderGPU.sh" : "./renderCPU.sh";
            const py_scripts = options.python_scripts || [].map(v => `-P "${v}"`);
            if (!options.frames) {
                this.all_frames = true;
                //Find the maximum amount of frames
                try {
                    const scriptResponse = yield utils_1.execShellCommand(`python3 python_scripts/blend_render_info.py "blends/${blend}"`, {
                        cwd: process.env.HOME_DIR
                    });
                    const csv = scriptResponse.trim().split(" ");
                    this.max_frames = parseInt(csv[1]);
                    this.current_frame = 0;
                }
                catch (err) {
                    console.error('[renderStart] Finding frame count of blend file failed:', err.message);
                    return reject(err);
                }
            }
            else {
                this.all_frames = 0;
                if (Array.isArray(options.frames) && options.frames.length !== 2) {
                    return reject(new Error('Invalid frame specification. Please provide array of start and end frame or null for all'));
                }
                this.current_frame = parseInt(options.frames[0]);
                this.max_frames = parseInt(options.frames[1]);
            }
            const frame_string = this.all_frames ? 'all' : this.current_frame + " " + this.all_frames ? 'all' : this.max_frames;
            console.log(`[renderStart] mode=${options.useGPU ? 'gpu' : 'cpu'} blend="${blend}" frames=${frame_string} ${py_scripts.join(" ")}`);
            try {
                const args = [
                    `"${blend}"`,
                    this.all_frames ? 'all' : this.current_frame.toString(),
                    this.all_frames ? 'all' : this.max_frames.toString()
                    //data.extra_args
                ].concat(py_scripts);
                const renderProcess = child_process_1.spawn(render_prefix, args, {
                    cwd: process.env.HOME_DIR,
                    stdio: ['ignore', 'pipe', 'pipe']
                })
                    .on('error', err => {
                    console.error('[RenderController] ERROR:', err.message);
                    const logObject = {
                        message: err.message,
                        timestamp: Date.now()
                    };
                    this.emit('log', logObject);
                    this.logs.push(logObject);
                    if (this.logs.length >= 50) {
                        this.logs.splice(0, this.logs.length - 50);
                    }
                    return reject(err);
                });
                renderProcess.stdout.on('data', (data) => {
                    const msg = data.toString();
                    const frame_match = msg.match(/(Saved:)(.*\/)(\d+.png)/);
                    if (frame_match && frame_match.length == 4) {
                        const frame = parseInt(frame_match[3]);
                        this.emit('frame', frame);
                        this.current_frame = frame + 1;
                        //get frame #
                    }
                    if (!this.active) {
                        this.emit('render_start', this.getSettings());
                        resolve(this.getSettings());
                        this.active = true;
                        this.started = Date.now();
                    }
                    this.pushLog(msg);
                });
                renderProcess.stderr.on('data', data => {
                    if (!this.active) {
                        this.emit('render_start', this.getSettings());
                        resolve(this.getSettings());
                        this.active = true;
                        this.started = Date.now();
                    }
                    this.pushLog(data.toString());
                });
                renderProcess
                    .on('exit', () => {
                    const time_taken = pretty_ms_1.default(Date.now() - this.started);
                    this.emit('render_stop', {
                        started: this.started,
                        time_taken,
                        blend: this.blend
                    });
                    //clear buffer logs
                    this.logs = [];
                    this.active = false;
                });
                this.process = renderProcess;
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    pushLog(message) {
        const logObject = {
            message,
            timestamp: Date.now()
        };
        this.emit('log', logObject);
        this.logs.push(logObject);
        if (this.logs.length >= 50) {
            this.logs.splice(0, this.logs.length - 50);
        }
    }
    cancelRender() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.active) {
                this.process.kill('SIGTERM');
                return null;
            }
            else {
                throw new Error('Render is not active.');
            }
        });
    }
    startTimer() {
        console.info('[RenderController] Starting statistics timer, running every', UPDATE_INTERVAL, "ms");
        Statistics_1.default().then(stats => {
            this.last_stats = stats;
            this.emit('stat', stats);
        });
        __classPrivateFieldSet(this, _timer, setInterval(() => {
            Statistics_1.default().then(stats => {
                this.last_stats = stats;
                this.emit('stat', stats);
            });
        }, UPDATE_INTERVAL));
    }
    isRenderActive() {
        return this.active;
    }
    getSettings() {
        const time_taken = pretty_ms_1.default(Date.now() - this.started);
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
        };
    }
    getStatistics() {
        return this.last_stats;
    }
    getLogs() {
        return this.logs;
    }
    emit(name, object) {
        for (const socketId in this.io.sockets.sockets) {
            const socket = this.io.sockets.sockets[socketId];
            if (socket.authorized) {
                socket.emit(name, object);
            }
        }
    }
}
exports.default = RenderController;
_timer = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVuZGVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2R1bGVzL1JlbmRlckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhEQUFxQztBQUNyQyxtQ0FBd0M7QUFDeEMsaURBQW1DO0FBQ25DLDBEQUEwQztBQUUxQyxNQUFNLGVBQWUsR0FBVyxDQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLElBQUUsRUFBRSxDQUFFLEdBQUcsSUFBSSxDQUFDO0FBYWxHLE1BQXFCLGdCQUFnQjtJQVlqQyxZQUFZLEVBQUU7UUFYZCxXQUFNLEdBQVksS0FBSyxDQUFDO1FBQ3hCLGtCQUFhLEdBQVcsQ0FBQyxDQUFDO1FBQzFCLGVBQVUsR0FBVyxDQUFDLENBQUM7UUFDdkIsWUFBTyxHQUFXLElBQUksQ0FBQztRQUN2QixlQUFVLEdBQXFCLEtBQUssQ0FBQztRQUNyQyxTQUFJLEdBQWdCLEVBQUUsQ0FBQztRQUN2QixPQUFFLEdBQUcsSUFBSSxDQUFBO1FBSVQseUJBQXNCO1FBRWxCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxlQUFlO1FBQ1gsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxXQUFXLENBQUMsS0FBYSxFQUFFLFVBQXlCLEVBQUU7UUFDbEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFNLE9BQU8sRUFBQyxNQUFNLEVBQUUsRUFBRTtZQUN2QyxJQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTztnQkFBRSxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQyxDQUFBO1lBQzNHLElBQUcsQ0FBQyxLQUFLO2dCQUFFLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxDQUFD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