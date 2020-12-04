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
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
dotenv_1.default.config();
const app = express_1.default();
const server = new http_1.Server(app);
if (!process.env.HOME_DIR) {
    console.error('Missing environment variable: \'HOME_DIR\', exiting');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('Missing environment variable: \'JWT_SECRET\', exiting');
    process.exit(1);
}
require('./modules/SetupDirectory');
const socket_js_1 = __importDefault(require("./socket.js"));
const server_1 = __importDefault(require("./server"));
const renderController = socket_js_1.default(server);
app.use('/api', server_1.default(renderController));
process.on('SIGTERM', () => gracefulShutdown);
process.on('SIGINT', () => gracefulShutdown);
server.listen(process.env.WEBPORT || 8080, () => {
    console.info(`Listening on :${process.env.WEBPORT || 8080}`);
});
function gracefulShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        console.info('Received shutdown signal. Cancelling any active renders...');
        yield renderController.cancelRender();
        process.exit(0);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxvREFBMkI7QUFDM0Isc0RBQThCO0FBQzlCLCtCQUEyQjtBQUUzQixnQkFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO0FBRWYsTUFBTSxHQUFHLEdBQUcsaUJBQU8sRUFBRSxDQUFBO0FBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUksYUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBRy9CLElBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtJQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUE7SUFDcEUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtDQUNsQjtBQUNELElBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRTtJQUN4QixPQUFPLENBQUMsS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7SUFDdEUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtDQUNsQjtBQUVELE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBRXBDLDREQUFnQztBQUNoQyxzREFBZ0M7QUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXhDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGdCQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO0FBRTVDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFDN0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtBQUU1QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFFLElBQUksRUFBQyxHQUFHLEVBQUU7SUFDekMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUM5RCxDQUFDLENBQUMsQ0FBQTtBQUVGLFNBQWUsZ0JBQWdCOztRQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLDREQUE0RCxDQUFDLENBQUE7UUFDMUUsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25CLENBQUM7Q0FBQSJ9