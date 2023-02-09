import {exec} from 'child_process'

export function execCombinedPromise(cmd: string, opts = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, opts, (error, stdout, stderr) => {
            if(error) return reject(error);
            return resolve(stdout?stdout:stderr)
        });
    });
}

export function execPromise(cmd: string, opts = {}): Promise<{stdout: string, stderr: string}> {
    return new Promise((resolve, reject) => {
        exec(cmd, opts, (error, stdout, stderr) => {
            if(error) return reject(error);
            return resolve({ stdout, stderr })
        });
    });
}
