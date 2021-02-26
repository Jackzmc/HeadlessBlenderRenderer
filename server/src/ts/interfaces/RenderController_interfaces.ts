export interface RenderOptions {
    useGPU?: boolean,
    python_scripts?: string[],
    frames?: string[],
}

export interface Render {
    currentFrame: number;
    maximumFrames: number;
    startFrame: number
    started: number;
    blend: string,
    startedById: string,
}

export interface StoppedRender extends Render {
    reason: StopReason,
    timeTaken: string
}