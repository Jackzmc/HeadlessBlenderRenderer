const router = require('express').Router();
const Database = require('../modules/Database')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { restrictedCheck, adminCheck } = require('../modules/Middlewares');

const db = new Database(path.join(__dirname, '/../../users.db'))

const SECRET = process.env.JWT_SECRET;

router.post('/login', (req, res) => {
    if(!req.body.email && !req.body.username) return res.status(400).json({error: 'Missing username/email'})
    if(!req.body.password) return res.status(400).json({error: 'Missing password'})
    db.selectUser(req.body.email || req.body.username, (err, user) => {
        if (err) return res.status(500).json({error:'Internal Server Error'});
        if (!user) return res.status(404).json({error:'No user found.'});
        bcrypt.compare(req.body.password, user.password, (err, passwordValid) => {
            if(err) return res.status(500).json({error: 'Internal Server Error'})
            if (!passwordValid) return res.status(401).json({ auth: false, token: null, user: null });
            jwt.sign({ 
                username: user.username,
                permissions: user.permissions,
            }, SECRET, { expiresIn: 86400 }, (err, token) => {
                if(err) return res.status(500).json({error: 'Generating login token failed.'})
                delete user.password;
                res.json({ auth: true, token: token, user: user });
            });
        })
       
        
    });
})

router.post('/resetpassword', restrictedCheck, (req,res) => {
    if(!req.body.current_password) return res.status(400).json({error: 'Missing current_password field'})
    if(!req.body.new_password || !req.body.password_confirm) return res.status(400).json({error: 'Missing new_password and/or password_confirm fields.'})
    if(!res.locals.user.username) return res.status(401).json({error: 'Unauthorized'})

    if(req.body.new_password !== req.body.password_confirm) {
        return res.status(400).json({error: 'new_password and password_confirm do not match.'})
    }

    db.selectUser(res.locals.user.username, (err, user) => {
        if (err) return res.status(500).json({error:'Internal Server Error'});
        if (!user) return res.status(404).json({error:'Account not found.'});

        const passwordValid = bcrypt.compare(req.body.current_password, user.password)
        if (!passwordValid) return res.status(401).json({ error: 'Current password is invalid' });
        
        //valid password, change it now.:
        db.changePassword(res.locals.user.username, req.body.new_password, (err) => {
            if(err) {
                console.error('[db:changePassword]', err.message)
                return res.status(500).json({error: 'Internal Server Error occurred while changing password.'})
            }
            return res.json({success: true})
        })
    });
})

router.get('/users', adminCheck, (req,res) => {
    db.selectAll((err, rows) => {
        if(err) return res.status(500).json({error: err.message})
        const users = rows.map(v => {
            delete v.password;
            return v;
        })
        return res.json(users)
    })
})

router.post('/users/:username', adminCheck, (req,res) => {
    if(!req.params.username) return res.status(400).json({error: 'Missing field', field: 'username'})
    if(!req.body.password) return res.status(400).json({error: 'Missing field', field: 'password'})
    if(!req.body.email) return res.status(400).json({error: 'Missing field', field: 'email'})
    if(req.body.permissions === null || req.body.permissions === undefined) return res.status(400).json({error: 'Missing field', field: 'permissions'})
    bcrypt.hash(req.body.password, 15, (err, hash) => {
        if(err) {
            console.error('[/auth/users/:username]', err.message)
            return res.status(500).json({error: err.message})
        }
        db.insert({
            username: req.params.username,
            password: hash,
            email: req.body.email,
            permissions: req.body.permissions
        }, (err) => {
            if(err) {
                console.error('[/auth/users/:username]', err.message)
                return res.status(500).json({error: err.message})
            }
            return res.json({success: true})
        })
    })
    
})

router.put('/users/:username', adminCheck, (req,res) => {
    db.selectUser(req.params.username, (err, user) => {  
        if(err) return res.status(500).json({error: 'Internal error fetching user'})
        if(!user) return res.status(404).json({error: 'User not found'})

        if(req.body.email) user.email = req.body.email;
        if(req.body.permissions) user.permissions = req.body.permissions;
        if(req.body.password) {
            bcrypt.hash(req.body.password, 15, (err, hash) => {
                if(err) return res.status(500).json({error: 'Internal error updating password.'})
                user.password = hash;
            })
        }
        db.update(user, (err) => {
            if(err) return res.status(500).json({error: 'Internal error updating user'})
            return res.json({success: true})
        })
    })

    
})

module.exports = router;