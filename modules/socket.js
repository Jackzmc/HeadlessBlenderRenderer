const {execShellCommand,spawnCommand} = require('../modules/utils.js');
const {spawn} = require('child_process')
const SocketIOFile = require('socket.io-file');
const csv = require('csvtojson')
const si = require('systeminformation');
const { resolve } = require('path');
const fs = require('fs').promises

const UPDATE_INTERVAL = 1000*(process.env.STAT_UPDATE_INTERVAL_SECONDS||30);

let last_stat = null;
let running_proc = null;

module.exports = (server) => {
    if(!server) alert("SERVER NULL")
    const io = require('socket.io')(server);
    main(io)

    return io;
}
function main(io) {
    io.on('connection',socket => {
        const uploader = new SocketIOFile(socket, {
            uploadDir: '/home/ezra/blends',							// simple directory
            //broke: accepts: ['application/octet-stream'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
            chunkSize: 10240,							// default is 10240(1KB)
            transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
            overwrite: true 							// overwrite file if exists, default is true.
        });
        uploader.on('start', (fileInfo) => {
            console.log('Start uploading');
            console.log(fileInfo);
        });
        uploader.on('complete', (fileInfo) => {
            console.log('Upload Complete.');
            console.log(fileInfo);
        });
        uploader.on('error', (err) => {
            console.log('Error!', err);
        });
        uploader.on('abort', (fileInfo) => {
            console.log('Aborted: ', fileInfo);
        });
        if(last_stat) socket.emit('stat',last_stat)
        socket.on('blends',async(data,callback) => {
            //return callback({files:[{name:'test.blend'}]})
            try {
                const files_raw = await fs.readdir('/home/ezra/blends');
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
                const files = await fs.readdir('/home/ezra/zips');
                callback({files:files.map(v => {return {name:v}})})
            }catch(err) {
                console.log(err)
                callback({error:true})
            }
        })
        socket.on('start',async(data,callback) => {
            const render_prefix = (data.mode === "cpu") ? "./renderCPU.sh" : "./renderGPU.sh";
            const py_scripts = data.scripts.map(v => `-P "${v}"`);
            io.emit('render_start');
           // const command = `${render_prefix} ${data.blend} ${frame_option} ${py_scripts.join(" ")} ${data.extra_args}`
            console.log(`[renderStart] ${render_prefix} "${data.blend}" ${data.frames?data.frames[0]:'all'} ${data.frames?data.frames[1]:'all'} ${py_scripts.join(" ")}`);
            running_proc = spawn(render_prefix,[
                `"${data.blend}"`,
                data.frames?data.frames[0]:'all',
                data.frames?data.frames[1]:'all'
                //data.extra_args
            ].concat(py_scripts),{
                cwd:'/home/ezra',
                stdio:['ignore','pipe','pipe']
            });
            running_proc.stdout.on('data',(data) => {
                const msg = data.toString();
                
                io.emit('log',{
                    message:msg
                })
            })
            running_proc.stderr.on('data',data => {
                const msg = data.toString();
                const frame_match = msg.match(/\d\d\d\d\.png/g);
                if(frame_match && frame_match.length > 0) {
                    const frame = parseInt(frame_match[0].replace('.png',''));
                    socket.emit('frame',frame)
                    //get frame #
                }
                io.emit('log',{
                    message:data.toString()
                })
            })
            running_proc.stderr.on('end', function () {
                console.log('Finished collecting data chunks.');
              });
            running_proc.on('error',data => {
                callback({error:data.toString()})
            })
            running_proc.on('close', function (code) {
                io.emit('render_stop')
                console.log('Child process exited with code ' + code);
              });
            running_proc.on('exit',(code,signal) => {
                console.log("EXIT. CODE:",code,"SIGNAL:",signal)
                callback({success:true});
            })
        })
        socket.on('cancel',(data = {},callback) => {
            if(!data) data = {}
            if(running_proc) {
                console.log('SENDING',data.type||'SIGTERM','to process')
                running_proc.kill(data.type||'SIGTERM');
                callback({success:true})
            }else{
                callback({render:false})
            }
        })
    })
    setInterval(() => doStat(io),UPDATE_INTERVAL)
    doStat(io);
}   
async function doStat(io) {
    const stats = await getStats();
    last_stat = stats;
    io.emit('stat',stats)
}

function getStats() {
    const SMI = process.platform === "win32" ? "\"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe\"" : "nvidia-smi";
    return new Promise(async(resolve,reject) => {
         try {
             const [si_cpu,si_gpu,cpu_speed,cpu_load,cpu_temp,nvidia_smi_result] = await Promise.all([
                 si.cpu(),
                 si.graphics(),
                 si.cpuCurrentspeed(),
                 si.currentLoad(),
                 si.cpuTemperature(),
                 execShellCommand(SMI + " --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader")
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
                     gpu_smi.push({
                         usage:parseInt(g[0]),
                         temp:parseInt(g[1]),
                         vram:{
                             current: parseInt(g[2]),
                             total: parseInt(g[3])
                         }
                     })
                 })
             }catch(err) {
                 console.warn("[/stats:WARN] Could not get nvidia gpu information")
             }
             for(let i=0;i<si_gpu.controllers.length;i++) {
                 const gpu = si_gpu.controllers[i];
                 let smi = gpu_smi[i] ? gpu_smi[i] : {
                     usage:-1,
                     temp:-1,
                     vram:{
                         current:-1,
                         total:-1
                     }
                 };
                 
                 gpus.push({
                     name:gpu.model,
                     usage:smi.usage,
                     temp:smi.temp,
                     vram:{
                         current:smi.vram.current*1.049e+6,
                         max:smi.vram.total*1.049e+6
                     },
                 })
             }
 
             return resolve({
                 cpu:{
                     name:si_cpu.brand,
                     usage:Math.round(cpu_load.currentload  * 1e1) / 1e1,
                     speed:cpu_speed.avg,
                     temp:cpu_temp.main,
                 },
                 gpu:gpus
             })
         }catch(err) {
             reject(err);
         }
     })
 }