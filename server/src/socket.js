const { resolve } = require('path');
const fs = require('fs').promises
const prettyMilliseconds = require('pretty-ms');

const RenderController = require('./RenderController')

module.exports = (server) => {
    const io = require('socket.io')({});
    io.attach(server, { cookie: false })

    const controller = new RenderController(io);
    return controller;
}