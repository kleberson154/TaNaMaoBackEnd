import express, { Application } from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import userRoutes from './routes/userRoutes'

dotenv.config()

const app: Application = express()

// Middleware
// CORS: permitir apenas origens confiáveis e suportar cookies (credentials)
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://tanamaosenac.vercel.app',
  'https://tanamaobackend.onrender.com'
]

app.use(
  cors({
    origin: (origin, callback) => {
      // requests do mesmo domínio (ex.: Postman, server-to-server) podem ter origin undefined
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      console.warn('CORS blocked origin:', origin)
      return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  })
)

// garantir que preflight requests OPTIONS sejam tratados
app.options('*', cors())
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
