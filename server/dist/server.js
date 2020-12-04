"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const Statistics_1 = __importDefault(require("./modules/Statistics"));
const cors_1 = __importDefault(require("cors"));
const cors = cors_1.default({
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});
router.use(body_parser_1.default.urlencoded({ extended: false, limit: '500mb' }));
router.use(body_parser_1.default.json());
router.options('*', cors);
router.use(cors);
const zip_1 = __importDefault(require("./routes/zip"));
const blends_1 = __importDefault(require("./routes/blends"));
const auth_1 = __importDefault(require("./routes/auth"));
const render_1 = __importDefault(require("./routes/render"));
router.use('/zips', zip_1.default);
router.use('/blends', blends_1.default);
router.use('/auth', auth_1.default);
router.get(['/stats', '/statistics'], (req, res) => {
    Statistics_1.default()
        .then(r => res.json(r))
        .catch(err => res.status(500).json({ error: err.message }));
});
function default_1(_controller) {
    router.use('/render', render_1.default(_controller));
    router.all('*', (req, res) => {
        res.status(404).json({ error: '404' });
    });
    return router;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLDhEQUFvQztBQUNwQyxzREFBNkI7QUFDN0IsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQyxzRUFBNkM7QUFDN0MsZ0RBQTZCO0FBRTdCLE1BQU0sSUFBSSxHQUFHLGNBQVUsQ0FBQztJQUNwQixPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUM7Q0FDNUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxxQkFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQTtBQUNyRSxNQUFNLENBQUMsR0FBRyxDQUFDLHFCQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUM3QixNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN6QixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBRWhCLHVEQUErQjtBQUMvQiw2REFBb0M7QUFDcEMseURBQWdDO0FBQ2hDLDZEQUFvQztBQUVwQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFJLENBQUMsQ0FBQTtBQUN6QixNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxnQkFBTSxDQUFDLENBQUE7QUFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsY0FBSSxDQUFDLENBQUE7QUFDekIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUM5QyxvQkFBVSxFQUFFO1NBQ1gsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFBO0FBQzdELENBQUMsQ0FBQyxDQUFBO0FBR0YsbUJBQXdCLFdBQTZCO0lBQ2pELE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGdCQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUUsRUFBRTtRQUN2QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBQ0YsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQU5ELDRCQU1DIn0=