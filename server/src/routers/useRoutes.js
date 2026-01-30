const express= require('express')
const { signupRoute, getUserRoute } = require('../controller/userController')

const router = express.Router()

router.post('/auth/signup',signupRoute)
router.get('/auth',getUserRoute)


module.exports =router