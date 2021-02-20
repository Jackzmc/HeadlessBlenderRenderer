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

/**
 * A middleware that checks if there is a valid user that has certain permission bits
 *
 * @export
 * @param {(number | number[])} requiredBits Either a bit or an array of bits. A single 0 will pass if user exists at all
 * @param {boolean} OR If requiredBits is an array, true a single bit is required, false all bits are required. Defaults to false
 * @returns 
 */
export function hasPermissionBit(requiredBits: number | number[], OR: boolean = false) {
    if(Array.isArray(requiredBits)) {
        requiredBits.forEach(bit => {
            if(bit < 0) {
                throw new Error('Bit must be a positive number')
            }else if(bit > 1 && bit % 2 != 0) {
                throw new Error('Bit must be a power of 2')
            }
        })
    }else{
        if(requiredBits > 1 && requiredBits as number % 2 != 0) {
            throw new Error('Bit must be a power of 2')
        }else if(requiredBits < 0) {
            throw new Error('Bit must be a positive number')
        }
    }
    return function(req: Request,res: Response, next: NextFunction) {
        if(req.method === "OPTION") return next();
        if(req.headers.authorization) {
            jwt.verify(req.headers.authorization, process.env.JWT_SECRET, (err: Error, decoded: User) => {
                if(err) {
                    res.status(401).json({error:'Unauthorized', code: 'UNAUTHORIZED'})
                }else{
                    if(decoded.permissions == 99) {
                        res.locals.user = decoded;
                        next();
                    }else{
                        const bits: number[] = dec2Bits(decoded.permissions);
                        decoded.permissionBits = bits;
                        if(Array.isArray(requiredBits)) {
                            const hasPermission = OR ? bits.find(v => requiredBits.includes(v)) : bits.every(v => requiredBits.includes(v))
                            if(hasPermission) {
                                res.locals.user = decoded;
                                next();
                            }else{
                                return res.status(403).json({error: 'Permisison level is too low.', code: 'FORBIDDEN'})
                            }
                        }else if(requiredBits == 0 || bits.includes(requiredBits as number)) {
                            
                            res.locals.user = decoded;
                            next();
                        }else{
                            return res.status(403).json({error: 'Permisison level is too low.', code: 'FORBIDDEN'})
                        }
                    }
                }
            })
        }else{
            return res.status(401).json({error:'Unauthorized', code: 'UNAUTHORIZED'})
        }
    }
}
export function hasPermissionNumber(requiredNumbers: number | number[], OR: boolean = false) {
    let input: number;
    if(Array.isArray(requiredNumbers)) {
        requiredNumbers.map(v => {
            if(v > 0) {
                return 1 << v
            }else{
                return 0;
            }
        })
    }else{
        if(requiredNumbers > 0) {
            input = 1 << requiredNumbers;
        }else{
            input = 0;
        }
    }
    return hasPermissionBit(input, OR);
}

function checkPermission(permLevel: number, req: Request,res: Response, next: NextFunction) {
    if(req.method === "OPTION") return next();
    if(req.headers.authorization) {
        jwt.verify(req.headers.authorization, process.env.JWT_SECRET, (err: Error, decoded: User) => {
            if(err) {
                res.status(401).json({error:'Unauthorized', code: 'TOKEN_EXPIRED'})
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

//Converts a decimal number (ex: 7) into its bits (1 + 2 + 4)
function dec2Bits(dec: number): number[] {
    const bin = dec.toString(2); //convert dec -> bin
    const rev = [...bin].reverse().join('') //reverse str. could implement backwards for loop but this worked.
    const numbers = [];
    for (let i = 0; i < bin.length; i++) {
        const char = rev.charAt(i);
        if (char === '1') {
            numbers.push(1 << i)
        }
    }
    return numbers;
}