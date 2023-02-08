import { Database, RunResult } from 'sqlite3'
import bcrypt from 'bcrypt'
import { User } from '../../ts/interfaces/RenderController_interfaces.js';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

export default class Users {
    #db: Database
    constructor(db: Database) {
        this.#db = db;
    }

    select(query: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.#db.get(
                `SELECT * FROM user WHERE email = ? OR username = ?`,
                [query, query], (err: NodeJS.ErrnoException, row: any) =>{
                    if(err) 
                        reject(err)
                    else
                        resolve(row);
                }
            )
        })
    }

    fetchAll(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.#db.all(
                `SELECT * FROM user`,
                (err: NodeJS.ErrnoException, rows: any) =>{
                    if(err) 
                        reject(err)
                    else
                        resolve(rows);
                }
            )
        })
    }

    insert(user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#db.run(
                'INSERT INTO user (username,email,password,permissions,created) VALUES (?,?,?,?,?)',
                [user.username, user.email, user.password, user.permissions, Date.now()], 
                (err: Error) => {
                    if(err) reject(err)
                    else resolve();
                }
            )
        })
    }
    update(user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#db.run(
                'UPDATE user SET username = ?, email = ?, password = ?, permissions = ?, tokens = ? WHERE username = ?',
                [user.username, user.email, user.password, user.permissions, user.tokens || 0, user.username], (err) => {
                    if(err) reject(err)
                    else resolve();
                }
            )
        })
    }

    login(user: User) {
        return new Promise((resolve, reject) => {
            this.#db.run(
                'UPDATE user set last_login = ? WHERE username = ?',
                [Date.now(), user.username], (result: RunResult, err: Error) => {
                    if(err) reject(err)
                    else resolve(result)
                }
            )
        });
    }
    delete(username: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#db.run(
                'DELETE FROM user WHERE username = ?',
                [username],
                (err) => {
                    if(err) reject(err)
                    else resolve()
                }
            )
        })
    }

    changePassword(username: string, password: string): Promise<void> {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, SALT_ROUNDS, (err: NodeJS.ErrnoException, hash: string) => {
                if(err) return reject(err)
                this.#db.run(
                    'UPDATE user SET password = ? WHERE username = ?',
                    [hash, username], (err) => {
                        if(err) reject(err)
                        else resolve()
                    }
                )
            })
        })
    }
}