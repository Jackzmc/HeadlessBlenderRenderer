import si from 'systeminformation'
import { execCombinedPromise } from './utils'
import csv from 'csvtojson'
import path from 'path'
import { ServerStats } from '../ts/interfaces/Statistics_interfaces.js';

const SERVER_VERSION = require('../../package.json').version;
const START_DATE: number = Date.now();
const NVIDIA_SMI_PATH = process.env.NVIDIA_SMI_PATH 
    ? `"${path.normalize(process.env.NVIDIA_SMI_PATH).replace(/\\\\/g, path.sep).replace(/\n/,'\\n')}"` 
    : "nvidia-smi";

let antispam_stat_inc: number = 0;

console.info('[STATISTICS] Running for version v' + SERVER_VERSION, 'systeminformation', si.version())


export default async function(): Promise<ServerStats> {
    try {
        const [si_cpu,si_mem,cpu_speed,cpu_load,cpu_temp,nvidia_smi_result] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.cpuCurrentSpeed(),
            si.currentLoad(),
            si.cpuTemperature(),
            execCombinedPromise(`${NVIDIA_SMI_PATH} --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name,fan.speed --format=csv,noheader`)
        ])
        const gpus = await parseGPUs(nvidia_smi_result as string)
        return {
            platform: process.platform,
            version: SERVER_VERSION,
            started: START_DATE,
            cpu: {
                name: si_cpu.brand,
                usage: Math.round(cpu_load.currentLoad  * 1e1) / 1e1,
                speed: cpu_speed.avg,
                temp: cpu_temp.main,
            },
            memory: {
                used:si_mem.used,
                total:si_mem.total,
                available:si_mem.available
            },
            gpus
        }
    }catch(err) {
        throw err;
    }
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
    } catch(err) {
        if(antispam_stat_inc == 0) {
            antispam_stat_inc = 15;
            console.warn("[Statistics:WARN] Could not get nvidia gpu information:", err.message)
        }
        antispam_stat_inc--;
    }
}