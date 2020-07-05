const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt')

class Db {
    constructor(file) {
        this.db = new sqlite3.Database(file);
        this.createTable()
    }

    createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS user (
                username text PRIMARY KEY,
                email text UNIQUE,
                password text,
                permissions integer)`
        const response = this.db.run(sql)
        bcrypt.hash('admin', (err, hash) => {
            const user = {
                username: 'admim',
                email: 'admin@localhost',
                password: hash,
                permissions: 2
            }
            this.insertAdmin(user);
        })
        
        return response;
    }

    selectUser(query, callback) {
        return this.db.get(
            `SELECT * FROM user WHERE email = ? OR username = ?`,
            [query, query], (err,row) =>{
                callback(err, row)
            }
        )
    }

    insertAdmin(user, callback) {
        return this.db.run(
            'INSERT INTO user (username,email,password,permissions) VALUES (?,?,?,?)',
            user, (err) => {
                if(callback) callback(err)
            })
    }

    selectAll(callback) {
        return this.db.all(`SELECT * FROM user`, function(err,rows) {
            callback(err,rows)
        })
    }

    insert(user, callback) {
        return this.db.run(
            'INSERT INTO user (username,email,password,permissions) VALUES (?,?,?,?)',
            [user.username, user.email, user.password, user.permissions], 
            (err) => {
                callback(err)
            })
    }

    update(user, callback) {
        return this.db.run(
            'UPDATE user SET username = ?, email = ?, password = ?, permissions = ? WHERE username = ?',
            [user.username, user.email, user.password, user.permissions, user.username], (err) => {
                callback(err)
            }
        )
    }

    changePassword(username, password, callback) {
        bcrypt.hash(password, 15, (err, hash) => {
            if(err) return callback(err);
            return this.db.run(
                'UPDATE user SET password = ? WHERE username = ?',
                [hash, username], (err) => {
                    callback(err);
                }
            )
        })
        
    }
}

module.exports = Db