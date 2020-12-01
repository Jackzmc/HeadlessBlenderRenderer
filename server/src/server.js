const bodyParser = require('body-parser')
const router = require('express').Router();
const Statistics = require('./modules/Statistics')
const cors = require('cors')({
    methods: ['GET', 'POST', 'PUT', 'DELETE']
})

router.use(bodyParser.urlencoded({ extended: false, limit: '500mb'}))
router.use(bodyParser.json())
router.options('*', cors)
router.use(cors)

router.use('/zips', require('./routes/zip'))
router.use('/blends', require('./routes/blends'))
router.use('/auth', require('./routes/auth'))
router.get(['/stats','/statistics'], (req, res) => {
    Statistics()
    .then(r => res.json(r))
    .catch(err => res.status(500).json({error: err.message}))
})


module.exports = (_controller) => {
    router.use('/render', require('./routes/render')(_controller))
    router.all('*',(req,res) => {
        res.status(404).json({error: '404'})
    })
    return router;
}