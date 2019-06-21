const {exec,spawn} = require('child_process')
exports.execShellCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if(error) return reject(error);
            return resolve(stdout?stdout:stderr)
        });
    });
}
exports.spawnCommand = (cmd,array = [],options = {}) => {
    return spawn(cmd,array,options)
}