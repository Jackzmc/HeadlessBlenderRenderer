const router = require('express').Router();
const fileUpload = require('express-fileupload')
const fs = require('fs').promises;
const { createReadStream } = require('fs')
const AdmZip = require('adm-zip');
const path = require('path')

const prettyMilliseconds = require('pretty-ms');


const ZIP_DIR = process.env.ZIP_DIR || `${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`

router.use(fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, //MB
    abortOnLimit: true,
}));


router.get('/:name',(req,res) => {
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
})
router.delete('/:name',(req,res) => {
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
router.get('/', async(req,res) => {
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

router.post('/upload', (req,res) => {
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