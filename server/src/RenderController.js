const Statistics = require('./modules/Statistics')

const UPDATE_INTERVAL = (process.env.STAT_UPDATE_INTERVAL_SECONDS||30) * 100;
module.exports = class Render {
    active = false;
    current_frame = 0;
    max_frames = 0;
    started = null;
    all_frames = false;
    constructor(io) {
        this.io = io;
        this.startTimer();
    }
    startRender(options = {}) {
        return new Promise((resolve,reject) => {
            const render_prefix = options.useGPU ? "./renderGPU.sh" : "./renderCPU.sh";
            const py_scripts = option.python_scripts.map(v => `-P "${v}"`);
            if(data.frames.all) {
                this.all_frames = true;
                //Find the maximum amount of frames
                execShellCommand(`python python_scripts/blend_render_info.py "blends/${data.blend}"`,{
                    cwd:process.env.HOME_DIR
                })
                .then(script_response => {
                    const csv = script_response.trim().split(" ");
                    this.max_frames = parseInt(csv[1]);
                    this.current_frame = 0;
                })
                .catch(err => {
                    console.warn('[renderStart] Finding frame count of blend file failed:', err.message)
                })
            }else{
                this.max_frames = options.frames.max
                this.current_frame = options.frames.start
            }
            const frame_string = this.all_frames? 'all': this.current_frame + " " + this.all_frames? 'all': this.max_frames
            console.log(`[renderStart] mode=${options.useGPU?'gpu':'cpu'} blend="${data.blend}" frames=${frame_string} ${py_scripts.join(" ")}`);
            const process = spawn(render_prefix,[
                `"${data.blend}"`,
                this.all_frames? 'all': this.current_frame,
                this.all_frames? 'all': this.max_frames
                //data.extra_args
            ].concat(py_scripts),{
                cwd:process.env.HOME_DIR,
                stdio:['ignore','pipe','pipe']
            });
            this.started = Date.now()
            resolve({
                process,
                frames: {
                    start: options.frames.start || 0, //Use options just incase process already on another frame
                    end: this.max_frames
                }
            })
            //
        })
        
    }
    cancelRender() {
        return new Promise((resolve,reject) => {
            if(this.active) {
                this.process.kill('SIGTERM')
            }else{
                reject(new Error('Render is not active.'))
            }
        })
    }
    startTimer() {
        this.timer = setInterval(() => {
            Statistics().then(stats => {
                this.last_stats = stats;
                this.io.emit('stat', stats)
            })
        }, UPDATE_INTERVAL)
    }
}