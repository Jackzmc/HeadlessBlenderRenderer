
import dotenv from 'dotenv'
import Express from 'express';
import {Server} from 'http'

dotenv.config()

const app = Express()
const server = new Server(app);


if(!process.env.HOME_DIR) {
    console.error('Missing environment variable: \'HOME_DIR\', exiting')
    process.exit(1)
}
if(!process.env.JWT_SECRET) {
    console.error('Missing environment variable: \'JWT_SECRET\', exiting')
    process.exit(1)
}

require('./modules/SetupDirectory');

import Socket from './socket.js'
import WebServer from './server'
const renderController = Socket(server);

app.use('/api', WebServer(renderController))

process.on('SIGTERM', () => gracefulShutdown)
process.on('SIGINT', () => gracefulShutdown)

server.listen(process.env.WEBPORT||8080,() => {
    console.info(`Listening on :${process.env.WEBPORT||8080}`)
})

async function gracefulShutdown() {
    console.info('Received shutdown signal. Cancelling any active renders...')
    await renderController.cancelRender()
    process.exit(0)
}