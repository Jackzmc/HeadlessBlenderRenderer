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
    db = renderController.db
    return router;
}
router.post(['/cancel','/abort'], hasPermissionBit(8), (req: Request,res: Response) => {
    renderController.cancelRender("CANCELLED", res.locals.user)
    .then(() => res.json({success: true}))
    .catch(err => res.status(500).json({error: err.message}))
})
router.get('/logs', hasPermissionBit([0,1]), (req: Request, res: Response) => {
    res.json(renderController.logs)
})
router.get('/status', (req: Request, res: Response) => {
    res.json(renderController.getStatus()) 
})
router.post('/:blend', hasPermissionBit(8), async(req: Request,res: Response) => {
    if(!req.params.blend) return res.status(400).json({error: 'Missing blend property'})
    if(!req.params.blend.endsWith(".blend")) return res.status(400).json({error: 'Specified file is not a valid *.blend file.'})
    const frames = (req.body.frames&&Array.isArray(req.body.frames)) ? req.body.frames : null;
    if(!req.body.frames || !Array.isArray(req.body.frames) || req.body.frames.length !== 2) return res.status(400).json({error: 'Frames property needs to be an array of two numbers: [start, end]'})
    if(res.locals.user.permissions == 99 || res.locals.user.permissionBits.includes(8)) {
        const options = {
            useGPU: req.body.useGPU === true || req.body.useGPU === "true" || req.body.mode === 'gpu',
            frames,
            python_scripts: req.body.python_scripts as string[] || [],
            render_quality: req.body.render_quality
        }
        db.logAction(res.locals.user, ActionType.START_RENDER, req.params.blend)
        try {
            const response = await renderController.startRender(req.params.blend, res.locals.user, options)
            res.json(response)
        }catch(err) {
            res.status(500).json({error: err.message, code: 'RENDER_ERROR'})
        }
    }
    
    
    
})
router.get('/preview', hasPermissionBit([0,1]), async(req: Request,res: Response) => {
    if(renderController.active) {
        try {
            const files = await readdir(process.env.HOME_DIR+"/tmp")
            if(files.length > 0) {
                const lastFile = files[files.length - 2];
                if(lastFile) {
                    res.setHeader('X-Frame', parseInt(lastFile));
                    res.sendFile(`${process.env.HOME_DIR}/tmp/${lastFile}`)
                    return
                }
            }
            res.json({error: 'No frames have been rendered', code:'RENDER_NO_FRAMES'})
        }catch(err) {
            console.log('[render/preview]',err)
            res.json({error: 'No frames have been rendered', code:'RENDER_NO_FRAMES'})
        }
    }else{
        return res.json({error: 'No render is currently running.', code: 'RENDER_INACTIVE'})
    }
})