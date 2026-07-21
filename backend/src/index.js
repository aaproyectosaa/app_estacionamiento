import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth.js'
import municipioRoutes from './routes/municipios.js'
import zonaRoutes from './routes/zonas.js'
import plazaRoutes from './routes/plazas.js'
import calleRoutes from './routes/calles.js'
import cuadraRoutes from './routes/cuadras.js'
import sessionRoutes from './routes/sessions.js'
import reportRoutes from './routes/reports.js'
import adminRoutes from './routes/admin.js'
import inspectorRoutes from './routes/inspector.js'
import { authenticate } from './middleware/auth.js'
import { sseMiddleware, broadcastPlazaUpdate } from './middleware/sse.js'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(morgan('short'))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intentá de nuevo más tarde.' },
})

app.use('/api/auth', limiter)

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '1mb' }))

app.locals.prisma = prisma

app.use('/api/auth', authRoutes)
app.use('/api/municipios', municipioRoutes)
app.use('/api/zonas', zonaRoutes)
app.use('/api/plazas', plazaRoutes)
app.use('/api/calles', calleRoutes)
app.use('/api/cuadras', cuadraRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/inspector', inspectorRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/live', sseMiddleware)

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, patente: true, role: true, legajo: true, createdAt: true, updatedAt: true },
    })
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    res.json(user)
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ message: 'Error al obtener datos del usuario' })
  }
})

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  const status = err.status || 500
  res.status(status).json({
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
