const router = require('express').Router();
const fileUpload = require('express-fileupload')
const fs = require('fs').promises;

const prettyMilliseconds = require('pretty-ms');
const path = require('path')


const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`

router.use(fileUpload({
    limits: { fileSize: 15 * 1024 * 1024 }, //MB
    abortOnLimit: true,
}));

router.get('/',async(req,res) => {
    try {
        const entries = await fs.readdir(BLENDS_DIR, {withFileTypes: true});
        const promises = [];
        entries.forEach(dirent => {
            if(dirent.isDirectory()) {
                promises.push(new Promise((resolve,reject) => {
                    fs.readdir(path.join(BLENDS_DIR, dirent.name))
                    .then(folderFiles => {
                        resolve({ 
                            folder: dirent.name,
                            files: folderFiles
                        })
                    })
                    .catch(err => reject(err))
                }))
            }else {
                if(!dirent.name.endsWith(".blend")) return;
                promises.push(new Promise((resolve,reject) => {
                    fs.stat(`${BLENDS_DIR}/${dirent.name}`)
                    .then(stat => {
                        resolve({
                            file: dirent.name,
                            size: stat.size,
                            date: prettyMilliseconds(Date.now() - stat.mtime, { secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 }),
                            timestamp: stat.mtime
                        })
                    })
                    .catch(err => reject(err));
                }))
            }
        })
        Promise.all(promises)
        .then(files => {
            const blends = files.filter(v => v.file)
            const folders = files.filter(v => v.folder)
            res.json({blends, folders})
        }).catch((err) => {
            res.status(500).json({error:err.message})
            console.error('[Error]',err.message)
        })
    }catch(err) {
        console.log(err)
        res.status(500).json({error:err.message})
    }
})

router.post('/upload', (req,res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.json({error:'No files were uploaded.'});
    }
    const promises = [];
    Object.values(req.files)
    .forEach(file => {
        promises.push(new Promise((resolve, reject) => {
            if(!file.name.endsWith(".blend")) return resolve({failed: file.name})
            file.mv(path.join(BLENDS_DIR, file.name), (err) => {
                if(err) {
                    resolve({failed: file.name})
                }else{
                    resolve({
                        file: file.name,
                        size: file.size
                    })
                }
            })
        }))
    })

    Promise.all(promises)
    .then((data) => {
        const successful = data.filter(v => !v.failed)
        const failures = data.filter(v => v.failed).map(v => v.failed)
        res.json({ uploads: successful, failures })
    })
    .catch(err => {

    })
})

module.exports = router;