const bodyParser = require('body-parser')
const router = require('express').Router();


router.use(bodyParser.urlencoded({ extended: false, limit: '500mb'}))
router.use(bodyParser.json())
router.use(require('cors')())

router.use('/zips', require('./routes/zip'))
router.use('/blends', require('./routes/blends'))


module.exports = (_controller) => {
    router.use('/render', require('./routes/render')(_controller))
    router.all('*',(req,res) => {
        res.status(404).json({error: '404'})
    })
    return router;
}