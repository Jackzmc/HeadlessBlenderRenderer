import RenderController from './modules/RenderController'
import jwt from 'jsonwebtoken'
import { Server } from 'http';
import DB from './modules/Database';
import { Socket } from 'socket.io';
declare module 'socket.io' {
    interface Socket {
        authorized: boolean
    }
}

const SECRET = process.env.JWT_SECRET;


export default function(server: Server) {
    const io = require('socket.io')({ cookie: false, serveClient: false });
    io.attach(server)
    
    const db = new DB('data.db')

    const controller = new RenderController(io, db)

    io.on('connection', (socket: Socket) => {
        socket.authorized = false;
        socket.on('login', (token: string, cb: CallableFunction) => {
            jwt.verify(token, SECRET, (err: Error, decoded: string) => {
                socket.authorized = true;
                if(err) return cb({error:'Failed to verify authentication.'})
                socket.emit('stat', controller.getStatistics())
                return cb({
                    valid: true, 
                    status: controller.getStatus()
                })
            })
        })
        
    })
    return controller;
}