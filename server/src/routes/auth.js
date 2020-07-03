const router = require('express').Router();
const Database = require('../modules/Database')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const db = new Database(path.join(__dirname, '/../../users.db'))

const SECRET = process.env.JWT_SECRET;

router.post('/login', (req, res) => {
    if(!req.body.email && !req.body.username) return res.status(400).json({error: 'Missing username/email'})
    if(!req.body.password) return res.status(400).json({error: 'Missing password'})
    db.selectUser(req.body.email || req.body.username, (err, user) => {
        if (err) return res.status(500).jsdon({error:'Internal Server Error'});
        if (!user) return res.status(404).send({error:'No user found.'});
        const passwordValid = bcrypt.compare(req.body.password, user.password)
        if (!passwordValid) return res.status(401).json({ auth: false, token: null, user: null });
        const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: 86400 });
        res.json({ auth: true, token: token, user: user });
    });
})
module.exports = router;