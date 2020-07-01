const {execShellCommand} = require('./utils.js');
const {spawn} = require('child_process')
const SocketIOFile = require('socket.io-file');
const csv = require('csvtojson')
const si = require('systeminformation');
const { resolve } = require('path');
const fs = require('fs').promises
const prettyMilliseconds = require('pretty-ms');

const UPDATE_INTERVAL = 1000*(process.env.STAT_UPDATE_INTERVAL_SECONDS||30);
const ZIP_DIR = process.env.ZIP_DIR||`${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR||`${process.env.HOME_DIR}/blends`

module.exports = (server) => {

}