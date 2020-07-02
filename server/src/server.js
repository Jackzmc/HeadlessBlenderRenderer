const bodyParser = require('body-parser')
const router = require('express').Router();

let renderController;

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())
router.use(require('cors')())

router.use('/zips', require('./routes/zip'))
router.use('/blends', require('./routes/blends'))

router.get('*',(req,res) => {
    res.status(404).send("<h1>404</h1>")
})
module.exports = (_controller) => {
    renderController = _controller;
    return router;
}