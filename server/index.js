const express = require('express')
require('dotenv').config()
const cors= require('cors')
const connect = require('./src/connnect/db')
const userSchema = require('./src/model/userSchema')
const userRoutes  = require('./src/routers/useRoutes')
const app = express()

app.use(cors({
    origin : '*'
}))

app.use(express.json())

app.use('/api',userRoutes)
try {
    connect()
    app.listen(process.env.PORT,()=>{
        
    })
} catch (error) {
 
    
}