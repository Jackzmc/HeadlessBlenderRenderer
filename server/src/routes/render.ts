import Express, { Request, Response } from 'express'
import { restrictedCheck, userCheck, hasPermissionBit } from '../modules/Middlewares';
const router = Express.Router()
import { promises, createReadStream } from 'fs';
import RenderController from '../modules/RenderController';
import Database, { ActionType } from '../modules/Database';
const {readdir} = promises;

let renderController: RenderController;
let db: Database;

export default function(controller: RenderController) {
    renderController = controller;
    db = renderController.getDatabase();
    return router;
}
router.post(['/cancel','/abort'], hasPermissionBit(8), (req: Request,res: Response) => {
    renderController.cancelRender()
    .then(() => res.json({success: true}))
    .catch(err => res.status(500).json({error: err.message}))
})
router.get('/logs', hasPermissionBit([0,1]), (req: Request, res: Response) => {
    res.json(renderController.getLogs())
})
router.get('/status', (req: Request, res: Response) => {
    res.json(renderController.getStatus()) 
})
router.post('/:blend', hasPermissionBit(8), (req: Request,res: Response) => {
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
    renderController.startRender(req.params.blend, res.locals.user, options)
    .then((response) => {
        res.json(response)
    })
    .catch(err => {
        res.status(500).json({error: err.message})
    })
})
router.get('/preview', hasPermissionBit([0,1]), async(req: Request,res: Response) => {
    if(renderController.isRenderActive()) {
        try {
            const files = await readdir(process.env.HOME_DIR+"/tmp")
            if(files.length > 0) {
                const lastFile = files[files.length - 1];
                res.setHeader('X-Frame', lastFile);
                res.sendFile(`${process.env.HOME_DIR}/tmp/${lastFile}`)
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