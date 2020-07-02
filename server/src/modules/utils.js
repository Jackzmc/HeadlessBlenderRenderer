const {exec} = require('child_process')

module.exports = {
    execShellCommand(cmd, opts = {}) {
        return new Promise((resolve, reject) => {
            exec(cmd, opts, (error, stdout, stderr) => {
                if(error) return reject(error);
                return resolve(stdout?stdout:stderr)
            });
        });
    }
}