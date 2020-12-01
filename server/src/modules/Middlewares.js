const jwt = require('jsonwebtoken')

module.exports = {
    restrictedCheck(req,res,next) {
        return checkPermission(0, req, res, next)
    },
    userCheck(req,res,next) {
        return checkPermission(1, req, res, next)
    },
    adminCheck(req,res,next) {
        return checkPermission(2, req, res, next)
    }
}

function checkPermission(permLevel,req,res,next) {
    if(req.method === "OPTION") return next();
    if(req.headers.authorization) {
        jwt.verify(req.headers.authorization, process.env.JWT_SECRET, (err, decoded) => {
            res.locals.user = decoded;
            if(err) return res.status(500).json({error:'Failed to verify authentication.'})
            if(decoded.permissions < permLevel) return res.status(401).json({error: 'Permisison level is too low.'})
            return next();
        })
    }else{
        return res.status(401).json({error:'Unauthorized'})
    }
}