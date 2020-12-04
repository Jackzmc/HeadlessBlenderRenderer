import Express, { Request, Response } from 'express'
import { restrictedCheck, userCheck } from '../modules/Middlewares';
const router = Express.Router()
import { promises, createReadStream } from 'fs';
import RenderController from '../modules/RenderController';
import Database, { ActionType } from '../modules/Database.js';
const {readdir} = promises;

let renderController: RenderController;
let db: Database;

export default function(_controller: RenderController) {
    renderController = _controller;
    this.db = renderController.db;
    return router;
}
router.post(['/cancel','/abort'], userCheck, (req: Request,res: Response) => {
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
router.post('/:blend', userCheck, (req: Request,res: Response) => {
    if(!req.params.blend) return res.status(400).json({error: 'Missing blend property'})
    if(!req.params.blend.endsWith(".blend")) return res.status(400).json({error: 'Specified file is not a valid *.blend file.'})
    const frames = (req.body.frames&&Array.isArray(req.body.frames)) ? req.body.frames : null;
    if(frames && req.body.frames.length !== 2) return res.status(400).json({error: 'Frames property needs to be an array of two numbers: [start, end]'})
    const options = {
        useGPU: req.body.useGPU === true || req.body.useGPU === "true" || req.body.mode === 'gpu',
        frames,
        python_scripts: req.body.python_scripts as string[] || []
    }
    db.logAction(res.locals.user, ActionType.START_RENDER, req.params.blend)
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

                const stream = createReadStream(`${process.env.HOME_DIR}/tmp/${lastFile}`)
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
                res.json({error: 'No frames have been rendered', code:'RaENDER_NO_FRAMES'})
            }
        }catch(err) {
            console.log('[render/preview]',err)
            res.json({error: 'No frames have been rendered', code:'RENDER_NO_FRAMES'})
        }
    }else{
        return res.json({error: 'No render is currently running.', code: 'RENDER_INACTIVE'})
    }
})