const {execShellCommand,spawnCommand} = require('../modules/utils.js');
const {spawn} = require('child_process')
const SocketIOFile = require('socket.io-file');
const csv = require('csvtojson')
const si = require('systeminformation');
const { resolve } = require('path');
const fs = require('fs').promises
const prettyMilliseconds = require('pretty-ms');

const UPDATE_INTERVAL = 1000*(process.env.STAT_UPDATE_INTERVAL_SECONDS||30);
const ZIP_DIR = process.env.ZIP_DIR||`${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR||`${process.env.HOME_DIR}/blends`

const {version} = require('../package.json')
let render = {
    active:false,
    proc:null,
    frame:{
        current:0,
        total:null,
    },
    started:null
}
let last_stat, io = null;

module.exports = (server) => {
    if(!server) return alert("SERVER NULL")
    io = require('socket.io')({});
    io.attach(server,{
        cookie: false
    })
    main()

    return io;
}
function main() {
    io.on('connection',socket => {
        const uploader = new SocketIOFile(socket, {
            uploadDir: process.env.UPLOAD_DIR||`${process.env.HOME_DIR}/blends`,							// simple directory
            //broke: accepts: ['application/octet-stream'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
            chunkSize: 10240,							// default is 10240(1KB)
            transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
            overwrite: true 							// overwrite file if exists, default is true.
        });
        if(render.active) {
            console.log('sending render_start to new socket')
            socket.emit('render_start',{
                max_frames:render.frame.total,
                frame:render.frame.current,
                started:render.started
            });
        }
        uploader.on('complete', (fileInfo) => {
            console.log(fileInfo);
        });
        if(last_stat) socket.emit('stat',last_stat)
        socket.on('blends',async(data,callback) => {
            //return callback({files:[{name:'test.blend'}]})
            try {
                const files_raw = await fs.readdir(BLENDS_DIR);
                const promises = [];
                files_raw.forEach(v => {
                    if(!v.endsWith(".blend")) return;
                    const promise = new Promise((resolve,reject) => {
                        fs.stat(`${BLENDS_DIR}/${v}`)
                        .then(stat => {
                            resolve({
                                name:v,
                                size:stat.size,
                                date:prettyMilliseconds(Date.now() - stat.mtime,{secondsDecimalDigits:0,millisecondsDecimalDigits:0})
                            })
                        }).catch(err => reject(err));
                    })
                    promises.push(promise);
                })

                Promise.all(promises)
                .then(files => {
                    callback({files})
                }).catch((err) => {
                    callback({error:err.message})
                    console.error('[Error]',err.message)
                })
            }catch(err) {
                console.log(err)
                callback({error:err.message})
            }
        })
        socket.on('zips',async(data,callback) => {
            //return callback({files:[{name:'test.blend'}]})
            try {
                const files_raw = await fs.readdir(ZIP_DIR);
                const promises = [];
                files_raw.forEach(v => {
                    if(!v.endsWith(".zip")) return;
                    const promise = new Promise((resolve,reject) => {
                        fs.stat(`${ZIP_DIR}/${v}`)
                        .then(stat => {
                            resolve({
                                name:v,
                                size:stat.size,
                                date:prettyMilliseconds(Date.now() - new Date(stat.mtime),{secondsDecimalDigits:0,millisecondsDecimalDigits:0})
                            })
                        }).catch(err => reject(err));
                    })
                    promises.push(promise);
                })
                Promise.all(promises)
                .then(files => {
                    callback({files})
                }).catch((err) => {
                    callback({error:err.message})
                    console.error('[Error]',err.message)
                })
            }catch(err) {
                console.log(err)
                callback({error:true})
            }
        })
        socket.on('start',async(data,callback) => {
            await startRender(data,callback);
        })
        socket.on('cancel',(data = {},callback) => {
            if(!data) data = {}
            if(render.proc) {
                render.proc.kill(data.type||'SIGTERM');
                callback({success:true})
            }else{
                callback({render:false})
            }
        })
    })
    setInterval(() => doStat(),UPDATE_INTERVAL)
    doStat();
}   
async function doStat() {
    const stats = await getStats();
    last_stat = stats;
    io.emit('stat',stats)
}
async function startRender(data,callback) {
    if(render.proc||render.active) {
        return callback({error:"A render is already started"})
    }
    render.started = null;
    const render_prefix = (data.mode === "cpu") ? "./renderCPU.sh" : "./renderGPU.sh";
    const py_scripts = data.scripts.map(v => `-P "${v}"`);
    if(!data.frames) {
        const all_frames_max = await execShellCommand(`python python_scripts/blend_render_info.py "blends/${data.blend}"`,{
            cwd:process.env.HOME_DIR
        }).catch(err => {
            console.warn('[renderStart] Finding frame count of blend file failed:',err.message)
        })

        if(all_frames_max) {
            const csv = all_frames_max.trim().split(" ");
            render.frame.total = parseInt(csv[1]);
        }else{
            render.frame.total = null;
        }
    }else{
        render.frame.total = data.frames[1]
    }
    console.log(`Frames to render for ${data.blend}: ${render.frame.total}`)
    io.emit('render_start',{
        max_frames:render.frame.total,
        frame:render.frame.current,
        started:render.started
    });
    render.active = true;
   // const command = `${render_prefix} ${data.blend} ${frame_option} ${py_scripts.join(" ")} ${data.extra_args}`
    console.log(`[renderStart] ${render_prefix} "${data.blend}" ${data.frames?data.frames[0]:'all'} ${data.frames?data.frames[1]:'all'} ${py_scripts.join(" ")}`);
    render.proc = spawn(render_prefix,[
        `"${data.blend}"`,
        data.frames?data.frames[0]:'all',
        data.frames?data.frames[1]:'all'
        //data.extra_args
    ].concat(py_scripts),{
        cwd:process.env.HOME_DIR,
        stdio:['ignore','pipe','pipe']
    });
    render.started = Date.now();
    //tell it started successfully
    callback({success:true})
    render.proc.stdout.on('data',(data) => {
        const msg = data.toString();
        const frame_match = msg.match(/(Saved:)(.*\/)(\d+.png)/)[3]
        if(frame_match && frame_match.length == 4) {
            const frame = parseInt(frame_match[3].replace('.png',''));
            io.emit('frame',frame)
            render.frame.current = frame;
            //get frame #
        }
        io.emit('log',{
            message:msg
        })
    })
    render.proc.stderr.on('data',data => {
        const msg = data.toString();
        io.emit('log',{
            error:true,
            message:data.toString()
        })
    })
    render.proc.on('error',data => {
        io.emit('log',{
            error:true,
            message:data.toString()
        })
    })
    render.proc.on('close', function (code) {
        const time_taken = prettyMilliseconds(Date.now() - render.started);
        io.emit('render_stop',{
            started:render.started,
            time_taken
        })
        io.emit('log',{
            message:'Render finished, took ' + time_taken
        })
        render.active = false;
        console.log('Blender Child exited with code: ' + code);
      });
}
function getStats() {
    const SMI = process.platform === "win32" ? "\"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe\"" : "nvidia-smi";
    return new Promise(async(resolve,reject) => {
        try {
            const [si_cpu,si_mem,cpu_speed,cpu_load,cpu_temp,nvidia_smi_result] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.cpuCurrentspeed(),
                si.currentLoad(),
                si.cpuTemperature(),
                execShellCommand(SMI + " --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name,fan.speed --format=csv,noheader")
            ])
            const gpus = [];
            gpu_smi = [];
            try {
                const arr = await csv({
                    noheader:true,
                    output: "csv"
                })
                .fromString(nvidia_smi_result)
                arr.forEach(g => {
                gpus.push({
                    usage: parseInt(g[0]),
                    temp:  parseInt(g[1]),
                    vram:{
                    current: parseInt(g[2])*1.049e+6,
                    total:  parseInt(g[3])*1.049e+6
                    },
                    name:g[4],
                    fan_speed:parseInt(g[5])
                })
                })
            }catch(err) {
                console.warn("[/stats:WARN] Could not get nvidia gpu information")
            }
 
            return resolve({
                platform:process.platform,
                version,
                cpu:{
                    name:si_cpu.brand,
                    usage:Math.round(cpu_load.currentload  * 1e1) / 1e1,
                    speed:cpu_speed.avg,
                    temp:cpu_temp.main,
                },
                mem:{
                used:si_mem.used,
                total:si_mem.total,
                free:si_mem.free,
                available:si_mem.available
                },
                gpu:gpus
            })
        }catch(err) {
            reject(err);
        }
    })
}
async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
      const res = resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    });
    return Array.prototype.concat(...files);
}
