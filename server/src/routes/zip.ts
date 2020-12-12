import Express from 'express'
import fileUpload from 'express-fileupload'
import {promises as fs, createReadStream} from 'fs'
import AdmZip from 'adm-zip'
import path from 'path'
import prettyMilliseconds from 'pretty-ms';
import { userCheck, hasPermissionBit } from '../modules/Middlewares';
const router = Express.Router();

const ZIP_DIR = process.env.ZIP_DIR || `${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`

const DL_TOKENS = new Map(); //<filename,{token:<expires>}>

router.use(fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, //MB
    abortOnLimit: true,
}));

router.get('/:name/download', hasPermissionBit(2), (req,res) => {
    if(req.query.token) {
        const downloadTokens = DL_TOKENS.get(req.params.name);
        //@ts-expect-error
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
router.post('/:name/token', hasPermissionBit(2), async(req,res) => {
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
        return res.status(404).json({error: "That zip does not exist.", code:'FILE_NOT_FOUND'})
    }
})
router.delete('/:name', hasPermissionBit(2), (req,res) => {
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
router.get('/', hasPermissionBit(2), async(req,res) => {
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
                        date: prettyMilliseconds(Date.now() - new Date(stat.mtime).getTime(),{ secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 }),
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
            res.status(500).json({error:err.message, code:'LIST_ERROR'})
            console.error('[Error]',err.message)
        })
    }catch(err) {
        console.log(err)
        res.status(500).json({error:true, code:'GENERIC_ERROR'})
    }
})

router.post('/upload', hasPermissionBit(2), (req,res) => {
    //@ts-expect-error
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.file) {
        return res.json({error:'No file was uploaded.', code:'MISSING_FILES'});
    }
    try {
         //@ts-expect-error
        const folderName = req.files.file.name.replace('.zip','').replace(/[^a-z0-9]/gi, '_').toLowerCase()
         //@ts-expect-error
        const zip = new AdmZip(req.files.file.data)
        zip.extractAllTo(path.join(BLENDS_DIR, folderName), true);
        res.send('Upload successful')
    }catch(err) {
        res.status(500).send('Upload failed')
    }
})
export default router;

function generateUID(): string {
    // I generate the UID from two parts here 
    // to ensure the random number provide enough bits.
    let firstPart: number | string = (Math.random() * 46656) | 0;
    let secondPart: number | string = (Math.random() * 46656) | 0;
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
        if(Object.keys(tokens).length == 0) {
            DL_TOKENS.delete(file)
        }else{
            DL_TOKENS.set(file, tokens)
        }
    })
}, 1000 * 60 * 30) //run every 30 minutes, clear up any expired tokens