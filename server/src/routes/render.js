const router = require('express').Router();
const { restrictedCheck, userCheck } = require('../modules/Middlewares');
const {readdir} = require('fs/promises')

let renderController;
router.post(['/cancel','/abort'], userCheck, (req,res) => {
    renderController.cancelRender()
    .then(() => res.json({success: true}))
    .catch(err => res.status(500).json({error: err.message}))
})
router.get('/logs', restrictedCheck, (req,res) => {
    res.json(renderController.getLogs())
})
router.get('/status', (req,res) => {
    res.json(renderController.getSettings()) 
})
router.post('/:blend', userCheck, (req,res) => {
    if(!req.params.blend) return res.status(400).json({error: 'Missing blend property'})
    if(!req.params.blend.endsWith(".blend")) return res.status(400).json({error: 'Specified file is not a valid *.blend file.'})
    const frames = req.body.frames&&Array.isArray(req.body.frames) || null;
    if(frames && req.body.frames.length !== 2) return res.status(400).json({error: 'Frames property needs to be an array of two numbers: [start, end]'})
    const options = {
        useGPU: req.body.useGPU || req.body.mode === 'gpu',
        frames,
        python_scripts: req.body.python_scripts || []
    }
    renderController.startRender(req.params.blend, options)
    .then((response) => {
        res.json(response)
    })
    .catch(err => {
        res.status(500).json({error: err.message})
    })
})
router.get('/preview', async(req,res) => {
    if(renderController.isRenderActive()) {
        try {
            const files = await readdir(process.env.HOME_DIR+"/tmp")
            if(files.length > 0) {
                const lastFile = files[files.length - 1];
                res.set('Content-Type', 'application/png')
                res.set('Content-Disposition', `attachment; filename="preview.png"`);

                createReadStream(`${process.env.HOME_DIR}/tmp/${lastFile}`)
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
                res.json({error: 'No frames have been rendered', code:'RENDER_NO_FRAMES'})
            }
        }catch(err) {
            console.log('[render/preview]',err)
            res.json({error: 'No frames have been rendered', code:'RENDER_NO_FRAMES'})
        }
    }else{
        return res.json({error: 'No render is currently running.', code: 'RENDER_INACTIVE'})
    }
})
module.exports = (_controller) => {
    renderController = _controller;
    return router;
}