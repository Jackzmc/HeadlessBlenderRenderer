const {execShellCommand,spawnCommand} = require('../modules/utils.js');
const {spawn} = require('child_process')
const SocketIOFile = require('socket.io-file');
const csv = require('csvtojson')
const si = require('systeminformation');
const { resolve } = require('path');
const fs = require('fs').promises

const UPDATE_INTERVAL = 1000*(process.env.STAT_UPDATE_INTERVAL_SECONDS||30);
const ZIP_DIR = process.env.ZIP_DIR||`${process.env.HOME_DIR}/zips`

let last_stat, running_proc, io, max_frames = null;
let render_active = false;

module.exports = (server) => {
    if(!server) alert("SERVER NULL")
    io = require('socket.io')(server);
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
        if(render_active) {
            console.log('sending render_start to new socket')
            socket.emit('render_start',{
                max_frames
            });
        }
        uploader.on('complete', (fileInfo) => {
            console.log(fileInfo);
        });
        if(last_stat) socket.emit('stat',last_stat)
        socket.on('blends',async(data,callback) => {
            //return callback({files:[{name:'test.blend'}]})
            try {
                const files_raw = await fs.readdir(`${process.env.HOME_DIR}/blends`);
                const files = files_raw.filter(v => v.endsWith(".blend")).map(v => {return {name:v}});
                callback({files})
            }catch(err) {
                console.log(err)
                callback({error:err.message})
            }
        })
        socket.on('zips',async(data,callback) => {
            //return callback({files:[{name:'test.blend'}]})
            try {
                const files_raw = await fs.readdir(ZIP_DIR);
                const files = files_raw.filter(v => v.endsWith(".zip")).map(v => {return {name:v}})
                callback({files})
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
            if(running_proc) {
                running_proc.kill(data.type||'SIGTERM');
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
    if(running_proc||render_active) {
        return callback({error:"A render is already started"})
    }
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
            max_frames = parseInt(csv[1]);
        }else{
            max_frames = null;
        }
    }else{
        max_frames = data.frames[1]
    }
    console.log(`Frames to render for ${data.blend}: ${max_frames}`)
    io.emit('render_start',{
        max_frames
    });
    render_active = true;
   // const command = `${render_prefix} ${data.blend} ${frame_option} ${py_scripts.join(" ")} ${data.extra_args}`
    console.log(`[renderStart] ${render_prefix} "${data.blend}" ${data.frames?data.frames[0]:'all'} ${data.frames?data.frames[1]:'all'} ${py_scripts.join(" ")}`);
    running_proc = spawn(render_prefix,[
        `"${data.blend}"`,
        data.frames?data.frames[0]:'all',
        data.frames?data.frames[1]:'all'
        //data.extra_args
    ].concat(py_scripts),{
        cwd:process.env.HOME_DIR,
        stdio:['ignore','pipe','pipe']
    });
    //tell it started successfully
    callback({success:true})
    running_proc.stdout.on('data',(data) => {
        const msg = data.toString();
        const frame_match = msg.match(/\d\d\d\d\.png/g);
        if(frame_match && frame_match.length > 0) {
            const frame = parseInt(frame_match[0].replace('.png',''));
            io.emit('frame',frame)
            //get frame #
        }
        io.emit('log',{
            message:msg
        })
    })
    running_proc.stderr.on('data',data => {
        const msg = data.toString();
        io.emit('log',{
            error:true,
            message:data.toString()
        })
    })
    running_proc.on('error',data => {
        io.emit('log',{
            error:true,
            message:data.toString()
        })
    })
    running_proc.on('close', function (code) {
        io.emit('render_stop')
        render_active = false;
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
                 execShellCommand(SMI + " --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name --format=csv,noheader")
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
                        name:g[4]
                    })
                 })
             }catch(err) {
                 console.warn("[/stats:WARN] Could not get nvidia gpu information")
             }
 
             return resolve({
                 cpu:{
                     name:si_cpu.brand,
                     usage:Math.round(cpu_load.currentload  * 1e1) / 1e1,
                     speed:cpu_speed.avg,
                     temp:cpu_temp.main,
                 },
                 mem:{
                    used:si_mem.used,
                    total:si_mem.total,
                    free:si_mem.free
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