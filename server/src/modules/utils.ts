import {exec} from 'child_process'

export function execShellCommand(cmd: string, opts = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, opts, (error, stdout, stderr) => {
            if(error) return reject(error);
            return resolve(stdout?stdout:stderr)
        });
    });
}
