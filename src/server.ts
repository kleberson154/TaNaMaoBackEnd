import express, { Application } from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import userRoutes from './routes/userRoutes'

dotenv.config()

const app: Application = express()

// Middleware
app.use(
  cors({
    origin: [
      'https://localhost:3000',
      'http://localhost:3000',
      'https://tanamaosenac.vercel.app/'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
app.use(express.json())
app.use(cookieParser())

// Conexão com o MongoDB
mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => {
    console.log('Conectado ao MongoDB')
  })
  .catch(error => {
    console.error('Erro ao conectar ao MongoDB:', error)
  })

// Rotas
app.use('/api', userRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log('Servidor rodando na porta:', PORT)
})
