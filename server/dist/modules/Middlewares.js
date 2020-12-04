"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCheck = exports.userCheck = exports.restrictedCheck = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function restrictedCheck(req, res, next) {
    return checkPermission(0, req, res, next);
}
exports.restrictedCheck = restrictedCheck;
function userCheck(req, res, next) {
    return checkPermission(1, req, res, next);
}
exports.userCheck = userCheck;
function adminCheck(req, res, next) {
    return checkPermission(2, req, res, next);
}
exports.adminCheck = adminCheck;
function checkPermission(permLevel, req, res, next) {
    if (req.method === "OPTION")
        return next();
    if (req.headers.authorization) {
        jsonwebtoken_1.default.verify(req.headers.authorization, process.env.JWT_SECRET, (err, decoded) => {
            res.locals.user = decoded;
            if (err)
                return res.status(500).json({ error: 'Failed to verify authentication.' });
            if (decoded.permissions < permLevel)
                return res.status(401).json({ error: 'Permisison level is too low.' });
            return next();
        });
    }
    else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kdWxlcy9NaWRkbGV3YXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxnRUFBOEI7QUFHOUIsU0FBZ0IsZUFBZSxDQUFDLEdBQVksRUFBQyxHQUFhLEVBQUUsSUFBa0I7SUFDMUUsT0FBTyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDN0MsQ0FBQztBQUZELDBDQUVDO0FBQ0QsU0FBZ0IsU0FBUyxDQUFDLEdBQVksRUFBQyxHQUFhLEVBQUUsSUFBa0I7SUFDcEUsT0FBTyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDN0MsQ0FBQztBQUZELDhCQUVDO0FBQ0QsU0FBZ0IsVUFBVSxDQUFDLEdBQVksRUFBQyxHQUFhLEVBQUUsSUFBa0I7SUFDckUsT0FBTyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDN0MsQ0FBQztBQUZELGdDQUVDO0FBRUQsU0FBUyxlQUFlLENBQUMsU0FBaUIsRUFBRSxHQUFZLEVBQUMsR0FBYSxFQUFFLElBQWtCO0lBQ3RGLElBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSyxRQUFRO1FBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUMxQyxJQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFO1FBQzFCLHNCQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsR0FBVSxFQUFFLE9BQWEsRUFBRSxFQUFFO1lBQ3hGLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztZQUMxQixJQUFHLEdBQUc7Z0JBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxrQ0FBa0MsRUFBQyxDQUFDLENBQUE7WUFDL0UsSUFBRyxPQUFPLENBQUMsV0FBVyxHQUFHLFNBQVM7Z0JBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSw4QkFBOEIsRUFBQyxDQUFDLENBQUE7WUFDeEcsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQTtLQUNMO1NBQUk7UUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFDLGNBQWMsRUFBQyxDQUFDLENBQUE7S0FDdEQ7QUFDTCxDQUFDIn0=