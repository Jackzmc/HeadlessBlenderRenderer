
import Express, { Request, Response } from 'express'
const router = Express.Router();
import Statistics from './modules/Statistics'
import corsModule from 'cors'
import RenderController from './modules/RenderController';
const cors = corsModule({
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    exposedHeaders: ['x-frame']
})

router.use(Express.urlencoded({ extended: false, limit: '500mb'}))
router.use(Express.json())
router.options('*', cors)
router.use(cors)

import zips from './routes/zip'
import blends from './routes/blends'
import auth from './routes/auth' 
import render from './routes/render'

router.use('/zips', zips)
router.use('/blends', blends)
router.get(['/stats','/statistics'], async(req: Request, res: Response) => {
    try {
        const r = await Statistics();
        res.json(r)
    }catch(err) {
        res.status(500).json({error: err.message, code: 'GENERIC_ERROR'})
    }
})


export default function(controller: RenderController) {
    router.use('/render', render(controller))
    router.use('/auth', auth(controller))
    router.all('*', (req: Request, res: Response) => {
        res.status(404).json({error: '404'})
    })
    return router;
}