import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '../types.js'

export function restrictedCheck(req: Request,res: Response, next: NextFunction) {
    return checkPermission(0, req, res, next)
}
export function userCheck(req: Request,res: Response, next: NextFunction) {
    return checkPermission(1, req, res, next)
}
export function adminCheck(req: Request,res: Response, next: NextFunction) {
    return checkPermission(2, req, res, next)
}

function checkPermission(permLevel: number, req: Request,res: Response, next: NextFunction) {
    if(req.method === "OPTION") return next();
    if(req.headers.authorization) {
        jwt.verify(req.headers.authorization, process.env.JWT_SECRET, (err: Error, decoded: User) => {
            if(err) {
                res.status(401).json({error:'Unauthorized', code: 'UNAUTHORIZED'})
            }else{
                if(decoded.permissions < permLevel) return res.status(403).json({error: 'Permisison level is too low.', code: 'FORBIDDEN'})
                res.locals.user = decoded;
                next();
            }
        })
    }else{
        return res.status(401).json({error:'Unauthorized', code: 'UNAUTHORIZED'})
    }
}