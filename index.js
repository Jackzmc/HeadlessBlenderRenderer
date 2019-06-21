require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('./modules/socket.js')(server);

const bodyParser = require('body-parser')
const {execShellCommand} = require('./modules/utils.js');


server.listen(process.env.WEBPORT||8080,() => {
    console.info(`Listening on :${process.env.WEBPORT||8080}`)
})
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static("public"))
app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

app.get('*',(req,res) => {
    res.status(404).send("<h1>404</h1>")
})