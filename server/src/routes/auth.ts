import { Request, Response } from 'express';
import User from '../types';
import Express from 'express'
const router = Express.Router();
import DB, { ActionType } from '../modules/Database'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { restrictedCheck, adminCheck, hasPermissionBit } from '../modules/Middlewares';
import { RunResult } from 'sqlite3';
import RenderController from '../modules/RenderController';

const SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

let db: DB;

export default function(controller: RenderController) {
    db = controller.getDatabase();
    return router;
}

router.post('/login', async(req: Request, res: Response) => {
    if(!req.body.email && !req.body.username) return res.status(400).json({error: 'Missing username/email', code:'MISSING_FIELD'})
    if(!req.body.password) return res.status(400).json({error: 'Missing password', code: 'MISSING_FIELD', field: 'password'})
    try {
        const user = await db.users.select(req.body.email || req.body.username);
        if (!user) return res.status(404).json({error:'No user found.'});
        bcrypt.compare(req.body.password, user.password, (err: Error, passwordValid: boolean) => {
            delete user.password;
            if(err) return res.status(500).json({error: 'Internal Server Error'})
            if (!passwordValid) return res.status(401).json({ auth: false, token: null, user: null });
            jwt.sign({ 
                username: user.username,
                permissions: user.permissions,
            }, SECRET, { expiresIn: 86400 }, (err: Error, token: string) => {
                user.last_login = Date.now()
                if(err) return res.status(500).json({error: 'Generating login token failed.', code: 'LOGIN_ERROR'})
                db.users.login(user)
                res.json({ auth: true, token: token, user: user });
            });
        })
    }catch(err) {
        res.status(500).json({error:'Internal Server Error', code: 'DB_SELECT_ERROR'});
    }
})

router.post('/resetpassword', hasPermissionBit(0), async(req: Request, res: Response) => {
    if(!req.body.current_password) return res.status(400).json({error: 'Missing current_password field', code: 'MISSINg_FIELD', field: 'current_password'})
    if(!req.body.new_password || !req.body.password_confirm) return res.status(400).json({error: 'Missing new_password and/or password_confirm fields.', code: 'MISSING_FIELD', field: 'new_password'})
    if(!res.locals.user.username) return res.status(401).json({error: 'Unauthorized', code: 'UNAUTHORIZED'})

    if(req.body.new_password !== req.body.password_confirm) {
        return res.status(400).json({error: 'new_password and password_confirm do not match.', code: 'PASSWORD_MISMATCH'})
    }
    try {
        const user = await db.users.select(res.locals.user.username);
        if (!user) return res.status(404).json({error:'Account not found.', code: 'USER_NOT_FOUND'});

        const passwordValid = bcrypt.compare(req.body.current_password, user.password)
        if (!passwordValid) return res.status(401).json({ error: 'Current password is invalid', code: 'INVALID_PASSWORD' });
        
        //valid password, change it now.:
        try {
            await db.users.changePassword(res.locals.user.username, req.body.new_password);
            res.json({success: true})
        }catch(err) {
            console.error('[db:changePassword]', err.message)
            res.status(500).json({error: 'Internal Server Error occurred while changing password.', code: 'DB_UPDATE_ERROR'})
        }
    }catch(err) {
        res.status(500).json({error:'Internal Server Error', code: 'DB_SELECT_ERROR'});
    }
})

router.get('/users', hasPermissionBit(64), async(req: Request, res: Response) => {
    try {
        const rows = await db.users.fetchAll();
        const users = rows.map((user: User) => {
            delete user.password;
            return user;
        })
        return res.json(users)
    }catch(err) {
        res.status(500).json({error: err.message, code: 'SELECT_ERROR'})
    }
})

router.post('/users/:username', hasPermissionBit(64), (req: Request,res: Response) => {
    if(!req.params.username) return res.status(400).json({error: 'Missing field', field: 'username', code: 'MISSING_FIELD'})
    if(!req.body.password) return res.status(400).json({error: 'Missing field', field: 'password', code: 'MISSING_FIELD'})
    //if(!req.body.email) return res.status(400).json({error: 'Missing field', field: 'email'})
    if(req.body.permissions === null || req.body.permissions === undefined) return res.status(400).json({error: 'Missing field', field: 'permissions', code: 'MISSING_FIELD'})
    if(isNaN(req.body.permissions) || req.body.permissions < 0 || req.body.permissions >= 99) return res.status(400).json({error: 'Invalid permissions number.', field: 'permissions', reason:'Permissions number is invalid. Refer to the permission bit map.', code: 'INVALID_FIELD'})
    bcrypt.hash(req.body.password, SALT_ROUNDS, (err: Error, hash: string) => {
        if(err) {
            console.error('[/auth/users/:username]', err.message)
            return res.status(500).json({error: err.message, code: 'HASH_ERROR'})
        }
        const user = {
            username: req.params.username.trim(),
            password: hash,
            email: req.body.email?.trim(),
            permissions: req.body.permissions,
        }
        db.users.insert(user)
        .then(() => {
            db.logAction(res.locals.user, ActionType.CREATE_USER, user)
            res.json({success: true})
        })
        .catch((err: Error) => {
            console.error('[/auth/users/:username]', err.message)
            res.status(500).json({error: err.message, code: 'DB_INSERT_ERROR'})
        })
    })
    
})

router.put('/users/:username', hasPermissionBit(64), async(req: Request, res: Response) => {
    try {
        const user = await db.users.select(req.params.username);
        if(!user) res.status(404).json({error: 'User not found', code: 'USER_NOT_FOUND'})
        const oldUser = user;

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
        try {
            await db.users.update(user);
            db.logAction(res.locals.user, ActionType.EDIT_USER, oldUser, user)
            res.json({success: true})
        }catch(err) {
            console.error('[Auth] Update user db error: ', err.message)
            res.status(500).json({error: 'Internal error updating user', code: 'DB_UPDATE_ERROR' })
        }
    }catch(err) {
        res.status(500).json({error: 'Internal error fetching user', code: 'DB_FETCH_ERROR'})
    }
})

router.delete('/users/:username', hasPermissionBit(64), async(req: Request, res: Response) => {
    try {
        const user = await db.users.select(req.params.username);
        if(!user) return res.status(404).json({error: 'User not found'})
        try {
            await db.users.delete(req.params.username);
            db.logAction(res.locals.user, ActionType.DELETE_USER, user)
             res.json({success: true})
        }catch(err) {
            res.status(500).json({error: 'Internal error deleting user', code: 'DB_DELETE_ERROR'})
        }
    }catch(err) {
        res.status(500).json({error: 'Internal error fetching user', code: 'DB_FETCH_ERROR'})
    }
})

router.get('/logs', hasPermissionBit(16), (req: Request, res: Response) => {
    db.getLogs((result: RunResult, err: Error) => {
        if(err) {
            res.status(500).json({error: err.message, code: 'DB_ERROR'})
        }else{
            res.json(result)
        }
    })
})

router.get('/settings', hasPermissionBit(32), (req: Request, res: Response) => {
    db.getSettings((err: Error, settings: any) => {
        if(err) {
            res.status(500).json({error: err.message, code: 'DB_ERROR'})
        }else{
            res.json(settings)
        }
    })
})
