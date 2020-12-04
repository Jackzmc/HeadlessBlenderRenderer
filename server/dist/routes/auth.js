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
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const Database_1 = __importDefault(require("../modules/Database"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Middlewares_1 = require("../modules/Middlewares");
const db = new Database_1.default(path_1.default.join(__dirname, '/../../users.db'));
const SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
router.post('/login', (req, res) => {
    if (!req.body.email && !req.body.username)
        return res.status(400).json({ error: 'Missing username/email' });
    if (!req.body.password)
        return res.status(400).json({ error: 'Missing password' });
    db.selectUser(req.body.email || req.body.username, (err, user) => {
        if (err)
            return res.status(500).json({ error: 'Internal Server Error' });
        if (!user)
            return res.status(404).json({ error: 'No user found.' });
        bcrypt_1.default.compare(req.body.password, user.password, (err, passwordValid) => {
            delete user.password;
            if (err)
                return res.status(500).json({ error: 'Internal Server Error' });
            if (!passwordValid)
                return res.status(401).json({ auth: false, token: null, user: null });
            jsonwebtoken_1.default.sign({
                username: user.username,
                permissions: user.permissions,
            }, SECRET, { expiresIn: 86400 }, (err, token) => {
                user.last_login = Date.now();
                if (err)
                    return res.status(500).json({ error: 'Generating login token failed.' });
                db.update(user, null);
                res.json({ auth: true, token: token, user: user });
            });
        });
    });
});
router.post('/resetpassword', Middlewares_1.restrictedCheck, (req, res) => {
    if (!req.body.current_password)
        return res.status(400).json({ error: 'Missing current_password field' });
    if (!req.body.new_password || !req.body.password_confirm)
        return res.status(400).json({ error: 'Missing new_password and/or password_confirm fields.' });
    if (!res.locals.user.username)
        return res.status(401).json({ error: 'Unauthorized' });
    if (req.body.new_password !== req.body.password_confirm) {
        return res.status(400).json({ error: 'new_password and password_confirm do not match.' });
    }
    db.selectUser(res.locals.user.username, (err, user) => {
        if (err)
            return res.status(500).json({ error: 'Internal Server Error' });
        if (!user)
            return res.status(404).json({ error: 'Account not found.' });
        const passwordValid = bcrypt_1.default.compare(req.body.current_password, user.password);
        if (!passwordValid)
            return res.status(401).json({ error: 'Current password is invalid' });
        //valid password, change it now.:
        db.changePassword(res.locals.user.username, req.body.new_password, (err) => {
            if (err) {
                console.error('[db:changePassword]', err.message);
                return res.status(500).json({ error: 'Internal Server Error occurred while changing password.' });
            }
            return res.json({ success: true });
        });
    });
});
router.get('/users', Middlewares_1.adminCheck, (req, res) => {
    db.selectAll((err, rows) => {
        if (err)
            return res.status(500).json({ error: err.message });
        const users = rows.map((user) => {
            delete user.password;
            return user;
        });
        return res.json(users);
    });
});
router.post('/users/:username', Middlewares_1.adminCheck, (req, res) => {
    if (!req.params.username)
        return res.status(400).json({ error: 'Missing field', field: 'username' });
    if (!req.body.password)
        return res.status(400).json({ error: 'Missing field', field: 'password' });
    if (!req.body.email)
        return res.status(400).json({ error: 'Missing field', field: 'email' });
    if (req.body.permissions === null || req.body.permissions === undefined)
        return res.status(400).json({ error: 'Missing field', field: 'permissions' });
    if (isNaN(req.body.permissions) || req.body.permissions < 0 || req.body.permissions >= 3)
        return res.status(400).json({ error: 'Invalid Field', field: 'permissions', reason: 'Permissions must be 0, 1, or 2.' });
    bcrypt_1.default.hash(req.body.password, SALT_ROUNDS, (err, hash) => {
        if (err) {
            console.error('[/auth/users/:username]', err.message);
            return res.status(500).json({ error: err.message });
        }
        db.insert({
            username: req.params.username.trim(),
            password: hash,
            email: req.body.email.trim(),
            permissions: req.body.permissions,
            created: Date.now(),
            last_login: Date.now()
        }, (err) => {
            if (err) {
                console.error('[/auth/users/:username]', err.message);
                return res.status(500).json({ error: err.message });
            }
            return res.json({ success: true });
        });
    });
});
router.put('/users/:username', Middlewares_1.adminCheck, (req, res) => {
    db.selectUser(req.params.username, (err, user) => __awaiter(void 0, void 0, void 0, function* () {
        if (err)
            return res.status(500).json({ error: 'Internal error fetching user' });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (req.body.email)
            user.email = req.body.email.trim();
        if (req.body.permissions)
            user.permissions = req.body.permissions;
        if (req.body.password) {
            try {
                const hash = yield bcrypt_1.default.hash(req.body.password, SALT_ROUNDS);
                user.password = hash;
            }
            catch (err) {
                return res.status(500).json({ error: 'Internal error updating password.' });
            }
        }
        db.update(user, (err) => {
            if (err) {
                console.error('[Auth] Update user db error: ', err.message);
                return res.status(500).json({ error: 'Internal error updating user' });
            }
            return res.json({ success: true });
        });
    }));
});
router.delete('/users/:username', Middlewares_1.adminCheck, (req, res) => {
    db.selectUser(req.params.username, (err, user) => {
        if (err)
            return res.status(500).json({ error: 'Internal error fetching user' });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        db.delete(req.params.username, (err) => {
            if (err)
                return res.status(500).json({ error: 'Internal error deleting user' });
            return res.json({ success: true });
        });
    });
});
router.get('/logs', Middlewares_1.adminCheck, (req, res) => {
    db.getLogs();
});
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUVBLHNEQUE2QjtBQUM3QixNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hDLG1FQUEwQztBQUMxQyxnREFBdUI7QUFDdkIsb0RBQTJCO0FBQzNCLGdFQUE4QjtBQUM5Qix3REFBb0U7QUFFcEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBUSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtBQUVoRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztBQUN0QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNsRCxJQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUFDLENBQUMsQ0FBQTtJQUN4RyxJQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUE7SUFDL0UsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM3RCxJQUFJLEdBQUc7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFDLHVCQUF1QixFQUFDLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO1FBQ2pFLGdCQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDcEUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ3JCLElBQUcsR0FBRztnQkFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFDLENBQUMsQ0FBQTtZQUNyRSxJQUFJLENBQUMsYUFBYTtnQkFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzFGLHNCQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2FBQ2hDLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUM1QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDNUIsSUFBRyxHQUFHO29CQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsZ0NBQWdDLEVBQUMsQ0FBQyxDQUFBO2dCQUM5RSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN2RCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFBO0lBR04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsNkJBQWUsRUFBRSxDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMzRSxJQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0I7UUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGdDQUFnQyxFQUFDLENBQUMsQ0FBQTtJQUNyRyxJQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQjtRQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsc0RBQXNELEVBQUMsQ0FBQyxDQUFBO0lBQ3JKLElBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxjQUFjLEVBQUMsQ0FBQyxDQUFBO0lBRWxGLElBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUNwRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGlEQUFpRCxFQUFDLENBQUMsQ0FBQTtLQUMxRjtJQUVELEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBVSxFQUFFLElBQVUsRUFBRSxFQUFFO1FBQy9ELElBQUksR0FBRztZQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsdUJBQXVCLEVBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxvQkFBb0IsRUFBQyxDQUFDLENBQUM7UUFFckUsTUFBTSxhQUFhLEdBQUcsZ0JBQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUUsSUFBSSxDQUFDLGFBQWE7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUUxRixpQ0FBaUM7UUFDakMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN2RSxJQUFHLEdBQUcsRUFBRTtnQkFDSixPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDakQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSx5REFBeUQsRUFBQyxDQUFDLENBQUE7YUFDbEc7WUFDRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSx3QkFBVSxFQUFFLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzdELEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBRyxHQUFHO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBVSxFQUFFLEVBQUU7WUFDbEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLHdCQUFVLEVBQUUsQ0FBQyxHQUFZLEVBQUMsR0FBYSxFQUFFLEVBQUU7SUFDdkUsSUFBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUTtRQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUMsQ0FBQyxDQUFBO0lBQ2pHLElBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFDLENBQUMsQ0FBQTtJQUMvRixJQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUE7SUFDekYsSUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUztRQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUMsQ0FBQyxDQUFBO0lBQ25KLElBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUM7UUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBQyxpQ0FBaUMsRUFBQyxDQUFDLENBQUE7SUFDOU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBVSxFQUFFLElBQVksRUFBRSxFQUFFO1FBQ3JFLElBQUcsR0FBRyxFQUFFO1lBQ0osT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDckQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQTtTQUNwRDtRQUNELEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDTixRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ3BDLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtZQUM1QixXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXO1lBQ2pDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ25CLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1NBQ3pCLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtZQUNkLElBQUcsR0FBRyxFQUFFO2dCQUNKLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFBO2FBQ3BEO1lBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQTtBQUVOLENBQUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBVSxFQUFFLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ3ZFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBTSxHQUFVLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDL0QsSUFBRyxHQUFHO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSw4QkFBOEIsRUFBQyxDQUFDLENBQUE7UUFDNUUsSUFBRyxDQUFDLElBQUk7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQTtRQUVoRSxJQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEQsSUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVc7WUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ2pFLElBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbEIsSUFBSTtnQkFDQSxNQUFNLElBQUksR0FBRyxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzthQUN4QjtZQUFBLE9BQU0sR0FBRyxFQUFFO2dCQUNSLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsbUNBQW1DLEVBQUMsQ0FBQyxDQUFBO2FBQzVFO1NBQ0o7UUFDRCxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQzNCLElBQUcsR0FBRyxFQUFFO2dCQUNKLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMzRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLDhCQUE4QixFQUFDLENBQUMsQ0FBQTthQUN2RTtZQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFBLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSx3QkFBVSxFQUFFLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFVLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUQsSUFBRyxHQUFHO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSw4QkFBOEIsRUFBQyxDQUFDLENBQUE7UUFDNUUsSUFBRyxDQUFDLElBQUk7WUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQTtRQUVoRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDbkMsSUFBRyxHQUFHO2dCQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsOEJBQThCLEVBQUMsQ0FBQyxDQUFBO1lBQzVFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLHdCQUFVLEVBQUUsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDNUQsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBQ2hCLENBQUMsQ0FBQyxDQUFBO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=