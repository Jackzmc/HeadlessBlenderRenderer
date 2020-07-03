const router = require('express').Router();
let renderController;
router.post(['/cancel','/abort'],(req,res) => {
    renderController.cancelRender()
    .then(() => res.json({success: true}))
    .catch(err => res.status(500).json({error: err.message}))
})
router.get('/logs', (req,res) => {
    res.json(renderController.getLogs())
})
router.get('/status', (req,res) => {
    res.json(renderController.getSettings()) 
})
router.post('/:blend',(req,res) => {
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
module.exports = (_controller) => {
    renderController = _controller;
    return router;
}