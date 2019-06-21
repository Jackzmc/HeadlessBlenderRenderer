const {execShellCommand,spawnCommand} = require('../modules/utils.js');
const csv = require('csvtojson')
const si = require('systeminformation');

const UPDATE_INTERVAL = process.env.STAT_UPDATE_INTERVAL_SECONDS?1000*process.env.STAT_UPDATE_INTERVAL_SECONDS:30000

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
        console.log("socket connected")
        if(last_stat) socket.emit('stat',last_stat)

        socket.on('start',async(data,callback) => {
            const render_prefix = (data.mode === "cpu") ? "./renderCPU.sh" : "./renderGPU.sh";
            const frame_option = data.frames?`${data.frames[0]} ${data.frames[1]}`:'* *';
            const py_scripts = data.scripts.map(v => `-P ${v}`);

           // const command = `${render_prefix} ${data.blend} ${frame_option} ${py_scripts.join(" ")} ${data.extra_args}`
            //console.log("run",command);

            const proc = spawnCommand(render_prefix,[
                data.blend,
                data.frames?data.frames[0]:'all',
                data.frames?data.frames[1]:'all',
                py_scripts
                //data.extra_args
            ],{
                cwd:'/home/ezra',
                stdio:['ignore','pipe','pipe']
            });
            running_proc = proc;
            proc.stdout.on('data',(data) => {
                const msg = data.toString();
                if(msg.startsWith("Saved:")) {
                    const frame = msg.match(/\d\d\d\d\.png/).replace('.png','');
                    const frame_number = parseInt(frame);
                    console.log(frame_number)
                    socket.emit('frame',frame_number)
                    //get frame #
                }
                socket.emit('log',{
                    message:msg
                })
            })
            proc.stderr.on('data',data => {
                socket.emit('log',{
                    message:data.toString()
                })
            })
            proc.on('error',data => {
                callback({error:data.toString()})
            })
            proc.on('exit',(code,signal) => {
                console.log("EXIT. CODE:",code,"SIGNAL:",signal)
                callback({success:true});
            })
        })
        socket.on('cancel',() => {
            running_proc.kill('SIGTERM');
        })
    })
    setInterval(async() => {
        const stats = await getStats();
        last_stat = stats;
        io.emit('stat',stats)
    },UPDATE_INTERVAL)
    
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