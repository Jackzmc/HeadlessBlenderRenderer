export interface RenderOptions {
    useGPU?: boolean,
    python_scripts?: string[],
    frames?: string[],
    renderQuality?: number
}

export interface Render {
    currentFrame: number;
    maximumFrames: number;
    startFrame: number
    started: number;
    blend: string,
    user: User
}

export interface StoppedRender extends Render {
    reason: StopReason,
    timeTaken: string
}

export interface User {
    username: string
    email: string
    permissions: number
    password?: string,
    created?: number,
    last_login?: number,
    tokens?: number,
    permissionBits?: number[]
}