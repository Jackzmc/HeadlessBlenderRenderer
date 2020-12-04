"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RenderController_1 = __importDefault(require("./modules/RenderController"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET;
function default_1(server) {
    const io = require('socket.io')({ cookie: false, serveClient: false });
    io.attach(server);
    const controller = new RenderController_1.default(io);
    io.on('connection', socket => {
        socket.authorized = false;
        socket.on('login', (token, cb) => {
            jsonwebtoken_1.default.verify(token, SECRET, (err, decoded) => {
                socket.authorized = true;
                if (err)
                    return cb({ error: 'Failed to verify authentication.' });
                socket.emit('stat', controller.getStatistics());
                return cb({
                    valid: true,
                    settings: controller.getSettings()
                });
            });
        });
    });
    return controller;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGtGQUF5RDtBQUN6RCxnRUFBOEI7QUFHOUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7QUFFdEMsbUJBQXdCLE1BQWM7SUFDbEMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN2RSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRWpCLE1BQU0sVUFBVSxHQUFHLElBQUksMEJBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7SUFFM0MsRUFBRSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDekIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBb0IsRUFBRSxFQUFFO1lBQ3ZELHNCQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFVLEVBQUUsT0FBZSxFQUFFLEVBQUU7Z0JBQ3RELE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO2dCQUN6QixJQUFHLEdBQUc7b0JBQUUsT0FBTyxFQUFFLENBQUMsRUFBQyxLQUFLLEVBQUMsa0NBQWtDLEVBQUMsQ0FBQyxDQUFBO2dCQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtnQkFDL0MsT0FBTyxFQUFFLENBQUM7b0JBQ04sS0FBSyxFQUFFLElBQUk7b0JBQ1gsUUFBUSxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3JDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sVUFBVSxDQUFDO0FBQ3RCLENBQUM7QUF0QkQsNEJBc0JDIn0=