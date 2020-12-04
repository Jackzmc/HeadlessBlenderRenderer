
import bodyParser from 'body-parser'
import Express from 'express'
const router = Express.Router();
import Statistics from './modules/Statistics'
import corsModule from 'cors'
import RenderController from './modules/RenderController';
const cors = corsModule({
    methods: ['GET', 'POST', 'PUT', 'DELETE']
})

router.use(bodyParser.urlencoded({ extended: false, limit: '500mb'}))
router.use(bodyParser.json())
router.options('*', cors)
router.use(cors)

import zips from './routes/zip'
import blends from './routes/blends'
import auth from './routes/auth' 
import render from './routes/render'

router.use('/zips', zips)
router.use('/blends', blends)
router.use('/auth', auth)
router.get(['/stats','/statistics'], (req, res) => {
    Statistics()
    .then(r => res.json(r))
    .catch(err => res.status(500).json({error: err.message}))
})


export default function(_controller: RenderController) {
    router.use('/render', render(_controller))
    router.all('*',(req,res) => {
        res.status(404).json({error: '404'})
    })
    return router;
}