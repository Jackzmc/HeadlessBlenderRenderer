

export interface LogObject {
    timestamp: number,
    text: string
}

export interface ServerStats {
    platform: string,
    version: string,
    started: number,
    cpu: CPUStats,
    memory: MemoryStats,
    gpus: GPUStats[]
}
export interface CPUStats {
    name: string,
    usage: number,
    speed: number,
    temp: number
}
export interface MemoryStats {
    used: number,
    total: number,
    available: number
}
export interface GPUStats {
    name: string,
    temp: number,
    fan_speed: number
    vram: {
        current: number,
        total: number
    }
}