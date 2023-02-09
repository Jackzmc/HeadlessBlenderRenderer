
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

(async() => {
    const renderController = await Socket(server);
    app.use('/api', WebServer(renderController))

    process.on('SIGTERM', () => gracefulShutdown())
    process.on('SIGINT', () => gracefulShutdown())
    
    server.listen(process.env.WEB_PORT||8081,() => {
        console.info(`Listening on :${process.env.WEB_PORT||8081}`)
    })

    async function gracefulShutdown() {
        console.info('Received shutdown signal. Cancelling any active renders...')
        await renderController.cancelRender("SHUTTING_DOWN")
        if(renderController.active) {
            console.info("Waiting for render to stop")
            // Poll until render_stops
            let timeout = 30_000 //30s
            while(renderController.active || timeout > 0) {
                await sleep(1000)
                timeout -= 1000
            }
        }
        process.exit(0)
    }
})()

const sleep = time => new Promise(res => setTimeout(res, time));
