const RenderController = require('./RenderController')

module.exports = (server) => {
    const io = require('socket.io')({ cookie: false, serveClient: false });
    io.attach(server)
    
    const controller = new RenderController(io)

    io.on('connection', socket => {
        if(controller.isRenderActive()) {
            const settings = controller.getSettings();
            socket.emit('render_start', {...settings});
        }
    })
    return controller;
}