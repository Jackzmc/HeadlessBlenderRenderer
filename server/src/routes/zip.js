const router = require('express').Router();
const fileUpload = require('express-fileupload')
const fs = require('fs').promises;
const { createReadStream } = require('fs')
const AdmZip = require('adm-zip');
const path = require('path')
const prettyMilliseconds = require('pretty-ms');
const { restrictedCheck, userCheck } = require('../modules/Middlewares');

const ZIP_DIR = process.env.ZIP_DIR || `${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`

const DL_TOKENS = new Map(); //<filename,{token:<expires>}>

router.use(fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, //MB
    abortOnLimit: true,
}));

router.get('/debug', (req,res) => {
    res.json(DL_TOKENS)
})

router.get('/:name/download', (req,res) => {
    if(req.query.token) {
        const downloadTokens = DL_TOKENS.get(req.params.name);
        if(downloadTokens && downloadTokens[req.query.token] && downloadTokens[req.query.token] >= Date.now()) {
            res.set('Content-Type', 'application/zip')
            res.set('Content-Disposition', `attachment; filename="${req.params.name}"`);

            const stream = createReadStream(`${ZIP_DIR}/${req.params.name}`)
            .on('open',() => {
                stream.pipe(res)
            })
            .on('error', (err) => {
                res.status(500).send(err)
            })
            .on('end', () => {
                res.end();
            })
        }else{
            return res.status(403).json({error: 'No download exists for that zip file or token has expired. Request one with POST /zips/:name/token.', code:'INVALID_TOKEN'})
        }
    }else{
        return res.status(403).json({error: 'Missing download token query parameter. Request one with POST /zips/:name/token.', code: 'MSSING_TOKEN'})
    }
})
router.post('/:name/token', userCheck, async(req,res) => {
    try {
        await fs.stat(`${ZIP_DIR}/${req.params.name}`)
        const token = generateUID();
        const expires = new Date();
        expires.setDate(expires.getHours() + 4)

        let tokens = DL_TOKENS.has(req.params.name) || {};
        tokens[token] = expires.getTime();
        DL_TOKENS.set(req.params.name, tokens)
        return res.json({token})
    }catch(err) {
        return res.status(404).json({error: "That zip does not exist."})
    }
})
router.delete('/:name', userCheck, (req,res) => {
    fs.unlink(`${ZIP_DIR}/${req.params.name}`)
    .then(() => {
        res.send()
    })
    .catch(err => {
        if(err.code === "ENOENT") {
            return res.status(500).json({error:"That zip does not exist."})
        }
        return res.status(500).json({error:err.message})
    })
})
router.get('/', userCheck, async(req,res) => {
    try {
        const files_raw = await fs.readdir(ZIP_DIR);
        const promises = [];
        files_raw.forEach(file => {
            if(!file.endsWith(".zip")) return;
            const promise = new Promise((resolve,reject) => {
                fs.stat(`${ZIP_DIR}/${file}`)
                .then(stat => {
                    resolve({
                        name: file,
                        size: stat.size,
                        date: prettyMilliseconds(Date.now() - new Date(stat.mtime),{ secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 }),
                        timestamp: stat.mtime
                    })
                })
                .catch(err => reject(err));
            })
            promises.push(promise);
        })
        Promise.all(promises)
        .then(files => {
            res.json({files})
        }).catch((err) => {
            res.status(500).json({error:err.message})
            console.error('[Error]',err.message)
        })
    }catch(err) {
        console.log(err)
        res.status(500).json({error:true})
    }
})

router.post('/upload', userCheck, (req,res) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.file) {
        return res.json({error:'No file was uploaded.'});
    }
    try {
        const folderName = req.files.file.name.replace('.zip','').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const zip = new AdmZip(req.files.file.data)
        zip.extractAllTo(path.join(BLENDS_DIR, folderName), true);
        res.send('Upload successful')
    }catch(err) {
        res.status(500).send('Upload failed')
    }
})
module.exports = router;

function generateUID() {
    // I generate the UID from two parts here 
    // to ensure the random number provide enough bits.
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

setInterval(() => {
    const now = Date.now()
    DL_TOKENS.forEach((tokens, file) => {
        for(const token in tokens) {
            if(now >= tokens[token]) {
                delete tokens[token];
            }
        }
        if(Object.keys(tokens[token]).length == 0) {
            DL_TOKENS.delete(file)
        }else{
            DL_TOKENS.set(file, tokens)
        }
    })
}, 1000 * 60 * 30) //run every 30 minutes, clear up any expired tokens