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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const systeminformation_1 = __importDefault(require("systeminformation"));
const utils_1 = require("./utils");
const csvtojson_1 = __importDefault(require("csvtojson"));
const SERVER_VERSION = require('../../package.json').version;
const START_DATE = Date.now();
let antispam_stat_inc = 0;
function default_1() {
    const SMI = process.platform === "win32" ? "\"C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe\"" : "nvidia-smi";
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            const [si_cpu, si_mem, cpu_speed, cpu_load, cpu_temp, nvidia_smi_result] = yield Promise.all([
                systeminformation_1.default.cpu(),
                systeminformation_1.default.mem(),
                systeminformation_1.default.cpuCurrentspeed(),
                systeminformation_1.default.currentLoad(),
                systeminformation_1.default.cpuTemperature(),
                utils_1.execShellCommand(SMI + " --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name,fan.speed --format=csv,noheader")
            ]);
            const gpus = yield parseGPUs(nvidia_smi_result);
            return resolve({
                platform: process.platform,
                version: SERVER_VERSION,
                started: START_DATE,
                cpu: {
                    name: si_cpu.brand,
                    usage: Math.round(cpu_load.currentload * 1e1) / 1e1,
                    speed: cpu_speed.avg,
                    temp: cpu_temp.main,
                },
                memory: {
                    used: si_mem.used,
                    total: si_mem.total,
                    available: si_mem.available
                },
                gpus
            });
        }
        catch (err) {
            reject(err);
        }
    }));
}
exports.default = default_1;
function parseGPUs(result) {
    return __awaiter(this, void 0, void 0, function* () {
        const gpus = [];
        try {
            const arr = yield csvtojson_1.default({
                noheader: true,
                output: "csv"
            }).fromString(result);
            arr.forEach(gpu => {
                gpus.push({
                    usage: parseInt(gpu[0]),
                    temp: parseInt(gpu[1]),
                    vram: {
                        current: parseInt(gpu[2]) * 1.049e+6,
                        total: parseInt(gpu[3]) * 1.049e+6
                    },
                    name: gpu[4],
                    fan_speed: parseInt(gpu[5])
                });
            });
            return gpus;
        }
        catch (err) {
            if (antispam_stat_inc == 0) {
                antispam_stat_inc = 15;
                console.warn("[Statistics:WARN] Could not get nvidia gpu information:", err.message);
            }
            antispam_stat_inc--;
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RhdGlzdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2R1bGVzL1N0YXRpc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwRUFBa0M7QUFDbEMsbUNBQTBDO0FBQzFDLDBEQUEyQjtBQUUzQixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDN0QsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRXRDLElBQUksaUJBQWlCLEdBQVcsQ0FBQyxDQUFDO0FBRWxDO0lBQ0ksTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLGtFQUFrRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7SUFDN0gsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFNLE9BQU8sRUFBQyxNQUFNLEVBQUUsRUFBRTtRQUN2QyxJQUFJO1lBQ0EsTUFBTSxDQUNGLE1BQU0sRUFBQyxNQUFNLEVBQUMsU0FBUyxFQUFDLFFBQVEsRUFBQyxRQUFRLEVBQUMsaUJBQWlCLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ2pGLDJCQUFFLENBQUMsR0FBRyxFQUFFO2dCQUNSLDJCQUFFLENBQUMsR0FBRyxFQUFFO2dCQUNSLDJCQUFFLENBQUMsZUFBZSxFQUFFO2dCQUNwQiwyQkFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDaEIsMkJBQUUsQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLHdCQUFnQixDQUFDLEdBQUcsR0FBRyw0R0FBNEcsQ0FBQzthQUN2SSxDQUFDLENBQUE7WUFDRixNQUFNLElBQUksR0FBRyxNQUFNLFNBQVMsQ0FBQyxpQkFBMkIsQ0FBQyxDQUFBO1lBRXpELE9BQU8sT0FBTyxDQUFDO2dCQUNYLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtnQkFDMUIsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE9BQU8sRUFBRSxVQUFVO2dCQUNuQixHQUFHLEVBQUU7b0JBQ0QsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLO29CQUNsQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUc7b0JBQ3BELEtBQUssRUFBRSxTQUFTLENBQUMsR0FBRztvQkFDcEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2lCQUN0QjtnQkFDRCxNQUFNLEVBQUU7b0JBQ0osSUFBSSxFQUFDLE1BQU0sQ0FBQyxJQUFJO29CQUNoQixLQUFLLEVBQUMsTUFBTSxDQUFDLEtBQUs7b0JBQ2xCLFNBQVMsRUFBQyxNQUFNLENBQUMsU0FBUztpQkFDN0I7Z0JBQ0QsSUFBSTthQUNQLENBQUMsQ0FBQTtTQUNMO1FBQUEsT0FBTSxHQUFHLEVBQUU7WUFDUixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDZjtJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUE7QUFDTixDQUFDO0FBcENELDRCQW9DQztBQUVELFNBQWUsU0FBUyxDQUFDLE1BQWM7O1FBQ25DLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJO1lBQ0EsTUFBTSxHQUFHLEdBQUcsTUFBTSxtQkFBRyxDQUFDO2dCQUNsQixRQUFRLEVBQUMsSUFBSTtnQkFDYixNQUFNLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDTixLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkIsSUFBSSxFQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZCLElBQUksRUFBQzt3QkFDRCxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFFLFFBQVE7d0JBQ25DLEtBQUssRUFBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUUsUUFBUTtxQkFDckM7b0JBQ0QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ1osU0FBUyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzlCLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUFBLE9BQU0sR0FBRyxFQUFFO1lBQ1IsSUFBRyxpQkFBaUIsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZCLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7YUFDdkY7WUFDRCxpQkFBaUIsRUFBRSxDQUFDO1NBQ3ZCO0lBQ0wsQ0FBQztDQUFBIn0=