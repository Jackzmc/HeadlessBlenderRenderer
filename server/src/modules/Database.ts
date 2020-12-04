import sqlite3, { RunResult } from 'sqlite3'
import bcrypt from 'bcrypt'
import User from '../types';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

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
    constructor(file: string) {
        this.#db = new sqlite3.Database(file);
        this.createTables()
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
        `
        this.#db.run(sql, (result: RunResult, err: Error) => {
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
                                permissions: 99
                            }
                            this.insert(user, (err: NodeJS.ErrnoException) => {
                                if(err.code != 'SQLITE_CONSTRAINT') {
                                    console.error('[Database] Failed to insert new admin account.\n', err.message)
                                }
                                
                            });
                        }
                    })
                }
            })
        })
        //Create a default admin user with password hash of 'admin'
    }

    selectUser(query: string, callback: Function) {
        this.#db.get(
            `SELECT * FROM user WHERE email = ? OR username = ?`,
            [query, query], (err: NodeJS.ErrnoException, row: any) =>{
                callback(err, row)
            }
        )
        return this;
    }

    selectAll(callback: Function) {
        this.#db.all(`SELECT * FROM user`, function(err: NodeJS.ErrnoException, rows: any) {
            callback(err,rows)
        })
        return this;
    }

    insert(user: User, callback: Function) {
        this.#db.run(
            'INSERT INTO user (username,email,password,permissions) VALUES (?,?,?,?)',
            [user.username, user.email, user.password, user.permissions], 
            (err: Error) => {
                if(callback) callback(err)
            }
        )
        return this;
    }

    update(user: User, callback: Function) {
        this.#db.run(
            'UPDATE user SET username = ?, email = ?, password = ?, permissions = ? WHERE username = ?',
            [user.username, user.email, user.password, user.permissions, user.username], (err) => {
                callback(err)
            }
        )
        return this;
    }

    delete(username: string, callback: Function) {
        this.#db.run(
            'DELETE FROM user WHERE username = ?',
            [username],
            (err) => {
                callback(err);
            }
        )
        return this;
    }

    changePassword(username: string, password: string, callback: Function) {
        bcrypt.hash(password, SALT_ROUNDS, (err: NodeJS.ErrnoException, hash: string) => {
            if(err) return callback(err);
            this.#db.run(
                'UPDATE user SET password = ? WHERE username = ?',
                [hash, username], (err) => {
                    callback(err);
                }
            )
        })
        return this;
    }

    getLogs(callback: Function) {
        this.#db.run(`SELECT timestamp, text FROM logs ORDER BY timestamp desc`, (result: RunResult, err: Error) => {
            callback(result, err)
        })
        return this;
    }

    LogAction(user: User, type: ActionType, ...extras: any[]) {
        const {permissions} = user;
        const username = `${user.username} [${getPermissionRole(user.permissions)}]`

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
            
            case ActionType.UPDATE_SETTINGS: 
                msg = `${username} has changed server settings. New Settings:\n${JSON.stringify(extras[0])}`
            default: 
                throw new Error('Unknown type of action:' + type)
        }
        this.#db.run(
            'INSERT INTO logs (timestamp, text) VALUES (?, ?)',
            [Date.now(), msg],
            null
        )
        console.info('[Server]', Date.now().toLocaleString(), msg)
        return this;
    }
}

function getPermissionRole(permissons: number) {
    switch(permissons) {
        case 0: return 'Restricted'
        case 1: return 'Normal'
        case 2: return 'Admin'
        case 99: return 'Default Admin'
        default:
            return 'Unknown'
    }
}

