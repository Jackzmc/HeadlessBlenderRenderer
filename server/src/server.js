const fs = require('fs').promises;
const bodyParser = require('body-parser')
const router = require('express').Router();
const prettyMilliseconds = require('pretty-ms');

const ZIP_DIR = process.env.ZIP_DIR || `${process.env.HOME_DIR}/zips`
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())
router.use(require('cors')())
router.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});
router.get('/zip/:name/download',(req,res) => {
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="${req.params.name}"`);

    const stream = fs2.createReadStream(`${ZIP_DIR}/${req.params.name}`)
    stream.on('open',() => {
        stream.pipe(res)
    })
    stream.on('error', (err) => {
        res.status(500).send(err)
        res.end()
    })
    stream.on('end', () => {
        res.end();
    })
})
router.get('/zip/:name/delete',(req,res) => {
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
router.get('/zips', async(req,res) => {
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
                        date: prettyMilliseconds(Date.now() - new Date(stat.mtime),{ secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 })
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
router.get('/blends',async(req,res) => {
    try {
        const files_raw = await fs.readdir(BLENDS_DIR);
        const promises = [];
        files_raw.forEach(file => {
            if(!file.endsWith(".blend")) return;
            const promise = new Promise((resolve,reject) => {
                fs.stat(`${BLENDS_DIR}/${file}`)
                .then(stat => {
                    resolve({
                        name: file,
                        size: stat.size,
                        date: prettyMilliseconds(Date.now() - stat.mtime,{secondsDecimalDigits:0,millisecondsDecimalDigits:0})
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
        res.status(500).json({error:err.message})
    }
})

router.get('*',(req,res) => {
    res.status(404).send("<h1>404</h1>")
})
module.exports = router;