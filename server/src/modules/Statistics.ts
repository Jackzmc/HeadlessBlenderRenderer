import si from 'systeminformation'
import { execShellCommand } from './utils'
import csv from 'csvtojson'

const SERVER_VERSION = require('../../package.json').version;
const START_DATE: number = Date.now();

let antispam_stat_inc: number = 0;

export default function() {
    const SMI = process.platform === "win32" ? "\"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe\"" : "nvidia-smi";
    return new Promise(async(resolve,reject) => {
        try {
            const [
                si_cpu,si_mem,cpu_speed,cpu_load,cpu_temp,nvidia_smi_result] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.cpuCurrentspeed(),
                si.currentLoad(),
                si.cpuTemperature(),
                execShellCommand(SMI + " --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name,fan.speed --format=csv,noheader")
            ])
            const gpus = await parseGPUs(nvidia_smi_result as string)
 
            return resolve({
                platform: process.platform,
                version: SERVER_VERSION,
                started: START_DATE,
                cpu: {
                    name: si_cpu.brand,
                    usage: Math.round(cpu_load.currentload  * 1e1) / 1e1,
                    speed: cpu_speed.avg,
                    temp: cpu_temp.main,
                },
                memory: {
                    used:si_mem.used,
                    total:si_mem.total,
                    available:si_mem.available
                },
                gpus
            })
        }catch(err) {
            reject(err);
        }
    })
}

async function parseGPUs(result: string) {
    const gpus = [];
    try {
        const arr = await csv({
            noheader:true,
            output: "csv"
        }).fromString(result);
        arr.forEach(gpu => {
            gpus.push({
                usage: parseInt(gpu[0]),
                temp:  parseInt(gpu[1]),
                vram:{
                    current: parseInt(gpu[2]) *1.049e+6,
                    total:  parseInt(gpu[3]) *1.049e+6
                },
                name: gpu[4],
                fan_speed: parseInt(gpu[5])
            })
        })
        return gpus;
    }catch(err) {
        if(antispam_stat_inc == 0) {
            antispam_stat_inc = 15;
            console.warn("[Statistics:WARN] Could not get nvidia gpu information:", err.message)
        }
        antispam_stat_inc--;
    }
}