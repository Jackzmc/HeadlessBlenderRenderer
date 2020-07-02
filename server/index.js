require('dotenv').config();
const app = require('express')()
const server = require('http').Server(app);
const fs = require('fs')
const path = require('path')

if(!process.env.HOME_DIR) {
    console.error('Missing environment variable: \'HOME_DIR\', exiting')
    process.exit(1)
}
const FOLDER_BLENDS = path.join(process.env.HOME_DIR, "blends")
const FOLDER_ZIPS = path.join(process.env.HOME_DIR, "zips")
const FOLDER_PYSCRIPTS = path.join(process.env.HOME_DIR, "python_scripts")
if(!fs.existsSync(process.env.HOME_DIR)) {
    console.error(`'HOME_DIR' path (${process.env.HOME_DIR}) does not exist. Exiting...`)
    process.exit(1)
}
try {
    fs.mkdirSync(FOLDER_BLENDS, {recrusive: true})
    fs.mkdirSync(FOLDER_ZIPS)
    fs.mkdirSync(FOLDER_PYSCRIPTS)

    if(!process.env.TMP_DIR) {
        const FOLDER_TMP = path.join(process.env.HOME_DIR, "tmp")
        fs.mkdirSync(FOLDER_TMP)
    }else{
        if(!fs.existsSync(process.env.TMP_DIR)) {
            console.error('\'TMP_DIR\' path does not exist. Exiting...')
            process.exit(1)
        }
    }
}catch(err) {
    //ignore errors
}

const renderController = require('./src/socket.js')(server);
app.use('/api/', require('./src/server.js')(renderController))

server.listen(process.env.WEBPORT||8080,() => {
    console.info(`Listening on :${process.env.WEBPORT||8080}`)
})