"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _db;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
var ActionType;
(function (ActionType) {
    ActionType[ActionType["CREATE_USER"] = 0] = "CREATE_USER";
    ActionType[ActionType["START_RENDER"] = 1] = "START_RENDER";
    ActionType[ActionType["CANCEL_RENDER"] = 2] = "CANCEL_RENDER";
    ActionType[ActionType["EDIT_USER"] = 3] = "EDIT_USER";
    ActionType[ActionType["UPDATE_SETTINGS"] = 4] = "UPDATE_SETTINGS";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
class DB {
    constructor(file) {
        _db.set(this, void 0);
        __classPrivateFieldSet(this, _db, new sqlite3_1.default.Database(file));
        this.createTables();
    }
    createTables() {
        const sql = `
        CREATE TABLE IF NOT EXISTS user (
            username text PRIMARY KEY,
            email text UNIQUE,
            password text,
            permissions integer,
            created integer,
            last_login integer
        );
        CREATE TABLE IF NOT EXISTS logs (
            timestamp integer PRIMARY KEY,
            text text
        );
        CREATE TABLE IF NOT EXISTS config (
            name text PRIMARY KEY,
            value text,
            type text
        )
        `;
        __classPrivateFieldGet(this, _db).run(sql, (result, err) => {
            __classPrivateFieldGet(this, _db).get('SELECT COUNT(*) as count FROM user', [], (err, row) => {
                if (row.count == 0) {
                    console.info('[Database] Creating a default admin user.');
                    bcrypt_1.default.hash('admin', SALT_ROUNDS, (err, hash) => {
                        if (err) {
                            console.error('[Database] Failed to hash default admin password');
                            process.exit(1);
                        }
                        else {
                            const user = {
                                username: 'admin',
                                email: 'admin@localhost',
                                password: hash,
                                permissions: 99
                            };
                            this.insert(user, (err) => {
                                if (err.code != 'SQLITE_CONSTRAINT') {
                                    console.error('[Database] Failed to insert new admin account.\n', err.message);
                                }
                            });
                        }
                    });
                }
            });
        });
        //Create a default admin user with password hash of 'admin'
    }
    selectUser(query, callback) {
        __classPrivateFieldGet(this, _db).get(`SELECT * FROM user WHERE email = ? OR username = ?`, [query, query], (err, row) => {
            callback(err, row);
        });
        return this;
    }
    selectAll(callback) {
        __classPrivateFieldGet(this, _db).all(`SELECT * FROM user`, function (err, rows) {
            callback(err, rows);
        });
        return this;
    }
    insert(user, callback) {
        __classPrivateFieldGet(this, _db).run('INSERT INTO user (username,email,password,permissions) VALUES (?,?,?,?)', [user.username, user.email, user.password, user.permissions], (err) => {
            if (callback)
                callback(err);
        });
        return this;
    }
    update(user, callback) {
        __classPrivateFieldGet(this, _db).run('UPDATE user SET username = ?, email = ?, password = ?, permissions = ? WHERE username = ?', [user.username, user.email, user.password, user.permissions, user.username], (err) => {
            callback(err);
        });
        return this;
    }
    delete(username, callback) {
        __classPrivateFieldGet(this, _db).run('DELETE FROM user WHERE username = ?', [username], (err) => {
            callback(err);
        });
        return this;
    }
    changePassword(username, password, callback) {
        bcrypt_1.default.hash(password, SALT_ROUNDS, (err, hash) => {
            if (err)
                return callback(err);
            __classPrivateFieldGet(this, _db).run('UPDATE user SET password = ? WHERE username = ?', [hash, username], (err) => {
                callback(err);
            });
        });
        return this;
    }
    getLogs() {
        return __classPrivateFieldGet(this, _db).run(`SELECT timestamp, text FROM logs ORDER BY timestamp desc`);
    }
    LogAction(user, type, ...extras) {
        const { username, permissions } = user;
        let msg;
        switch (type) {
            case ActionType.CREATE_USER: {
                msg = `${username} has added a new user: ${extras[0]}`;
                break;
            }
            default:
                throw new Error('Unknown type of action:' + type);
        }
        __classPrivateFieldGet(this, _db).run('INSERT INTO logs (timestamp, text) VALUES (?, ?)', [Date.now(), msg], null);
        return this;
    }
}
exports.default = DB;
_db = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kdWxlcy9EYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUE0QztBQUM1QyxvREFBMkI7QUFHM0IsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFbkUsSUFBWSxVQU1YO0FBTkQsV0FBWSxVQUFVO0lBQ2xCLHlEQUFXLENBQUE7SUFDWCwyREFBWSxDQUFBO0lBQ1osNkRBQWEsQ0FBQTtJQUNiLHFEQUFTLENBQUE7SUFDVCxpRUFBZSxDQUFBO0FBQ25CLENBQUMsRUFOVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQU1yQjtBQUVELE1BQXFCLEVBQUU7SUFFbkIsWUFBWSxJQUFZO1FBRHhCLHNCQUFxQjtRQUVqQix1QkFBQSxJQUFJLE9BQU8sSUFBSSxpQkFBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBQztRQUN0QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVELFlBQVk7UUFDUixNQUFNLEdBQUcsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBa0JYLENBQUE7UUFDRCxrQ0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBaUIsRUFBRSxHQUFVLEVBQUUsRUFBRTtZQUNoRCxrQ0FBUyxHQUFHLENBQUMsb0NBQW9DLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUNoRSxJQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFO29CQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtvQkFDekQsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQVUsRUFBRSxJQUFZLEVB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