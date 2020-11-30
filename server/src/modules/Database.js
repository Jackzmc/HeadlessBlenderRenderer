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
        //Create a default admin user with password hash of 'admin'
        bcrypt.hash('admin', (err, hash) => {
            const user = {
                username: 'admin',
                email: 'admin@localhost',
                password: hash,
                permissions: 9
            }
            this.insert(user);
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
                if(callback) callback(err)
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

    delete(username, callback) {
        return this.db.run(
            'DELETE FROM user WHERE username = ?',
            [username],
            (err) => {
                callback(err);
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