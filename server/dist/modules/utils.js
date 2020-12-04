"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execShellCommand = void 0;
const child_process_1 = require("child_process");
function execShellCommand(cmd, opts = {}) {
    return new Promise((resolve, reject) => {
        child_process_1.exec(cmd, opts, (error, stdout, stderr) => {
            if (error)
                return reject(error);
            return resolve(stdout ? stdout : stderr);
        });
    });
}
exports.execShellCommand = execShellCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kdWxlcy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBa0M7QUFFbEMsU0FBZ0IsZ0JBQWdCLENBQUMsR0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ25ELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDbkMsb0JBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN0QyxJQUFHLEtBQUs7Z0JBQUUsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFBLENBQUMsQ0FBQSxNQUFNLENBQUEsQ0FBQyxDQUFBLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBUEQsNENBT0MifQ==