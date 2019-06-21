require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('./modules/socket.js')(server);

const bodyParser = require('body-parser')
const {execShellCommand} = require('./modules/utils.js');


server.listen(process.env.WEBPORT||8080,() => {
    console.info(`Listening on :${process.env.WEBPORT||8080}`)
})
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static("public"))

//probably WS instead
app.get('/stats',async(req,res) => {
    try {
        //todo: promise.all
        try {
            const [si_cpu,si_gpu,cpu_speed,cpu_load,cpu_temp,nvidia_smi_result] = await Promise.all([
                si.cpu(),
                si.graphics(),
                si.cpuCurrentspeed(),
                si.currentLoad(),
                si.cpuTemperature(),
                execShellCommand("\"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe\" --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader")
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

            res.json({
                cpu:{
                    name:si_cpu.brand,
                    usage:Math.round(cpu_load.currentload  * 1e1) / 1e1,
                    speed:cpu_speed.avg,
                    temp:cpu_temp.main,
                },
                gpu:gpus
            })
        }catch(err) {
            res.status(500).json({error:"Failed to acquire information"});
        }
        
    }catch(err) {
        console.log(err.message)
        res.status(500).json({error:"An error happened dude"})
    }
})
app.get('*',(req,res) => {
    res.status(404).send("<h1>404</h1>")
})