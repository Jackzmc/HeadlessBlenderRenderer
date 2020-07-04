const RenderController = require('./modules/RenderController')
const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET;

module.exports = (server) => {
    const io = require('socket.io')({ cookie: false, serveClient: false });
    io.attach(server)
    
    const controller = new RenderController(io)

    io.on('connection', socket => {
        socket.authorized = false;
        socket.on('login', (token, cb) => {
            jwt.verify(token, SECRET, (err, decoded) => {
                socket.authorized = true;
                if(err) return cb({error:'Failed to verify authentication.'})
                socket.emit('stat', controller.getStatistics())
                return cb({
                    valid: true, 
                    settings: controller.getSettings()
                })
            })
        })
        
    })
    return controller;
}