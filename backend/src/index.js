import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth.js'
import municipioRoutes from './routes/municipios.js'
import zonaRoutes from './routes/zonas.js'
import sessionRoutes from './routes/sessions.js'
import reportRoutes from './routes/reports.js'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Make prisma available to routes
app.locals.prisma = prisma

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/municipios', municipioRoutes)
app.use('/api/zonas', zonaRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/reports', reportRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
