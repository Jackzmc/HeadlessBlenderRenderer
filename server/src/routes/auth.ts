import { Request, Response } from 'express';
import User from '../types';
import Express from 'express'
const router = Express.Router();
import Database from '../modules/Database'
import path from 'path'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { restrictedCheck, adminCheck } from '../modules/Middlewares'

const db = new Database(path.join(__dirname, '/../../users.db'))

const SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

router.post('/login', (req: Request, res: Response) => {
    if(!req.body.email && !req.body.username) return res.status(400).json({error: 'Missing username/email'})
    if(!req.body.password) return res.status(400).json({error: 'Missing password'})
    db.selectUser(req.body.email || req.body.username, (err, user) => {
        if (err) return res.status(500).json({error:'Internal Server Error'});
        if (!user) return res.status(404).json({error:'No user found.'});
        bcrypt.compare(req.body.password, user.password, (err, passwordValid) => {
            delete user.password;
            if(err) return res.status(500).json({error: 'Internal Server Error'})
            if (!passwordValid) return res.status(401).json({ auth: false, token: null, user: null });
            jwt.sign({ 
                username: user.username,
                permissions: user.permissions,
            }, SECRET, { expiresIn: 86400 }, (err, token) => {
                user.last_login = Date.now()
                if(err) return res.status(500).json({error: 'Generating login token failed.'})
                db.update(user, null)
                res.json({ auth: true, token: token, user: user });
            });
        })
       
        
    });
})

router.post('/resetpassword', restrictedCheck, (req: Request, res: Response) => {
    if(!req.body.current_password) return res.status(400).json({error: 'Missing current_password field'})
    if(!req.body.new_password || !req.body.password_confirm) return res.status(400).json({error: 'Missing new_password and/or password_confirm fields.'})
    if(!res.locals.user.username) return res.status(401).json({error: 'Unauthorized'})

    if(req.body.new_password !== req.body.password_confirm) {
        return res.status(400).json({error: 'new_password and password_confirm do not match.'})
    }

    db.selectUser(res.locals.user.username, (err: Error, user: User) => {
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

router.get('/users', adminCheck, (req: Request, res: Response) => {
    db.selectAll((err: Error, rows) => {
        if(err) return res.status(500).json({error: err.message})
        const users = rows.map((user: User) => {
            delete user.password;
            return user;
        })
        return res.json(users)
    })
})

router.post('/users/:username', adminCheck, (req: Request,res: Response) => {
    if(!req.params.username) return res.status(400).json({error: 'Missing field', field: 'username'})
    if(!req.body.password) return res.status(400).json({error: 'Missing field', field: 'password'})
    if(!req.body.email) return res.status(400).json({error: 'Missing field', field: 'email'})
    if(req.body.permissions === null || req.body.permissions === undefined) return res.status(400).json({error: 'Missing field', field: 'permissions'})
    if(isNaN(req.body.permissions) || req.body.permissions < 0 || req.body.permissions >= 3) return res.status(400).json({error: 'Invalid Field', field: 'permissions', reason:'Permissions must be 0, 1, or 2.'})
    bcrypt.hash(req.body.password, SALT_ROUNDS, (err: Error, hash: string) => {
        if(err) {
            console.error('[/auth/users/:username]', err.message)
            return res.status(500).json({error: err.message})
        }
        db.insert({
            username: req.params.username.trim(),
            password: hash,
            email: req.body.email.trim(),
            permissions: req.body.permissions,
            created: Date.now(),
            last_login: Date.now()
        }, (err: Error) => {
            if(err) {
                console.error('[/auth/users/:username]', err.message)
                return res.status(500).json({error: err.message})
            }
            return res.json({success: true})
        })
    })
    
})

router.put('/users/:username', adminCheck, (req: Request, res: Response) => {
    db.selectUser(req.params.username, async(err: Error, user: User) => {  
        if(err) return res.status(500).json({error: 'Internal error fetching user'})
        if(!user) return res.status(404).json({error: 'User not found'})

        if(req.body.email) user.email = req.body.email.trim();
        if(req.body.permissions) user.permissions = req.body.permissions;
        if(req.body.password) {
            try {
                const hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
                user.password = hash;
            }catch(err) {
                return res.status(500).json({error: 'Internal error updating password.'})
            }
        }
        db.update(user, (err: Error) => {
            if(err) {
                console.error('[Auth] Update user db error: ', err.message)
                return res.status(500).json({error: 'Internal error updating user'})
            }
            return res.json({success: true})
        })
    })
})

router.delete('/users/:username', adminCheck, (req: Request, res: Response) => {
    db.selectUser(req.params.username, (err: Error, user: User) => {  
        if(err) return res.status(500).json({error: 'Internal error fetching user'})
        if(!user) return res.status(404).json({error: 'User not found'})

        db.delete(req.params.username, (err) => {
            if(err) return res.status(500).json({error: 'Internal error deleting user'})
            return res.json({success: true})
        })
    })
})

router.get('/logs', adminCheck, (req: Request, res: Response) => {
    db.getLogs()
})

export default router;