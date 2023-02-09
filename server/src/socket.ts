import RenderController from './modules/RenderController'
import jwt from 'jsonwebtoken'
import { Server } from 'http';
import DB from './modules/Database/index';
import { Socket } from 'socket.io';
declare module 'socket.io' {
    interface Socket {
        authorized: boolean
    }
}

const SECRET = process.env.JWT_SECRET;


export default async function(server: Server) {
    const io = require('socket.io')({ cookie: false, serveClient: false });
    io.attach(server)
    
    const db = new DB('data.db')

    const controller = new RenderController(io, db)

    await controller.initalize()


    io.on('connection', (socket: Socket) => {
        socket.authorized = false;
        socket.on('login', (token: string, cb: CallableFunction) => {
            jwt.verify(token, SECRET, (err: Error, decoded: string) => {
                if(err) {
                    cb({error:'Failed to verify authentication.'})
                    socket.disconnect()
                    return;
                }
                socket.authorized = true;

                db.getSettings((err: Error, settings: any) => {
                    return cb({
                        statsAvailable: controller.statsAvailable,
                        valid: true, 
                        status: controller.getStatus(),
                        settings
                    })
                })
                socket.emit('stat', controller.statistics)

            })
        })
        
    })
    return controller;
}