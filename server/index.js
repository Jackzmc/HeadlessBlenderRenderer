require('dotenv').config();
const app = require('express')()
const server = require('http').Server(app);


if(!process.env.HOME_DIR) {
    console.error('Missing environment variable: \'HOME_DIR\', exiting')
    process.exit(1)
}

require('./src/modules/SetupDirectory');

const renderController = require('./src/socket.js')(server);
app.use('/api', require('./src/server.js')(renderController))

server.listen(process.env.WEBPORT||8080,() => {
    console.info(`Listening on :${process.env.WEBPORT||8080}`)
})