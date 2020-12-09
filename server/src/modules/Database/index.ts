import sqlite3, { RunResult } from 'sqlite3'
import bcrypt from 'bcrypt'
import User from '../../types';
import Users from './Users'

export const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

export enum ActionType {
    CREATE_USER,
    EDIT_USER,
    DELETE_USER,
    START_RENDER,
    CANCEL_RENDER,
    UPDATE_SETTINGS
}

export default class DB {
    #db: sqlite3.Database
    users: Users

    constructor(file: string) {
        this.#db = new sqlite3.Database(file, (err) => {
            if(err) {
                console.error('Database initalization error: ', err)
                process.exit(1)
            }
        });
        this.users = new Users(this.#db);

        this.createTables()
        this.setupSettings();
    }

    createTables() {
        const sql = `
        CREATE TABLE IF NOT EXISTS user (
            username text PRIMARY KEY,
            email text UNIQUE,
            password text,
            permissions integer,
            created integer,
            last_login integer,
            tokens integer
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
        `
        this.#db.exec(sql, (err: Error) => {
            this.#db.get('SELECT COUNT(*) as count FROM user', [], (err, row) => {
                if(row.count == 0) {
                    console.info('[Database] Creating a default admin user.')
                    bcrypt.hash('admin', SALT_ROUNDS, (err: Error, hash: string) => {
                        if(err) {
                            console.error('[Database] Failed to hash default admin password')
                            process.exit(1)
                        }else{
                            const user = {
                                username: 'admin',
                                email: 'admin@localhost',
                                password: hash,
                                permissions: 99,
                                tokens: -1
                            }
                            try {
                                this.users.insert(user)
                                this.logAction(null, ActionType.CREATE_USER, user);
                            }catch(err) {
                                if(err.code != 'SQLITE_CONSTRAINT') {
                                    console.error('[Database] Failed to insert new admin account.\n', err.message)
                                }
                            }
                        }
                    })
                }
            })
        })
        //Create a default admin user with password hash of 'admin'
    }

    setupSettings() {
        const sql = `
            INSERT or IGNORE INTO config (name, value, type) VALUES('extraShellArgs', 'false', 'boolean');
            INSERT or IGNORE INTO config (name, value, type) VALUES('recordStats', 'true', 'boolean');
        `
        this.#db.exec(sql);
    }


    getLogs(callback: Function) {
        this.#db.all(`SELECT timestamp, text FROM logs ORDER BY timestamp desc`, (err: Error, rows: any[]) => {
            callback(rows, err)
        })
        return this;
    }

    getSettings(callback: Function) {
        this.#db.all("SELECT * from config", (err: Error, rows: any[]) => {
            if(err) {
                callback(err, null);
            }else{
                let settings = {}
                rows.forEach(row => {
                    switch(row.type) {
                        case "boolean": 
                            settings[row.name] = row.value === "true"
                        
                        case 'integer': 
                            settings[row.name] = parseInt(row.value)
                        
                        default:
                            settings[row.name] = row.value
                    }
                })
                callback(null, settings)
            }
        })
        return this;
    }
    
    updateSetting(name: string, value: any, callback: Function) {
        this.#db.get("SELECT type from config where name = ?", [name], (err: Error, row: any) => {
            if(!err) {
                this.#db.run("UPDATE config SET value=? WHERE name = ?", [value.toString(), name], (err) => {
                    if(err) {
                        callback(err, false)
                    }else{
                        callback(null, true)
                    }
                })
            }else{
                callback(err, false);
            }
        })
        return this;
    }

    logAction(user: User, type: ActionType, ...extras: any[]) {
        const username = user ? `${user.username} (${user.permissions})` : null

        let msg: string;
        switch(type) {
            case ActionType.CREATE_USER: 
                const newUser = extras[0] as User;
                msg = `${username} has added a new user: ${newUser.username} (permissions = ${newUser.permissions})`
                break;
            
            case ActionType.START_RENDER: 
                msg = `${username} has started a new render. File: ${extras[0]}, Mode: ${extras[1]}`
                break;
            
            case ActionType.CANCEL_RENDER: 
                msg = `${username} has cancelled a render. File: ${extras[0]}. Started by: ${extras[1]}`
                break;
            
            case ActionType.EDIT_USER:
                const prevUser = extras[0] as User;
                const editedUser = extras[1] as User;
                msg = `${username} has updated user '${editedUser.username}' `
                break;
            
            case ActionType.UPDATE_SETTINGS: 
                msg = `${username} has changed server settings. New Settings:\n${JSON.stringify(extras[0])}`
                break;
            default: 
                throw new Error('Unknown type of action: ' + ActionType[type])
        }
        this.#db.run(
            'INSERT INTO logs (timestamp, text) VALUES (?, ?)',
            [Date.now(), msg],
            null
        )
        console.info(`[${new Date().toLocaleTimeString()}] [Server] ${msg}`)
        return this;
    }
}

