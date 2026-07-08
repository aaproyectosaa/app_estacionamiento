import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// In-memory sessions (replace with DB in production)
const activeSessions = new Map()

router.post('/start', authenticate, async (req, res) => {
  try {
    const { municipioId, zonaNombre, patente, calle, lat, lng } = req.body
    const userId = req.userId

    if (!municipioId || !zonaNombre || !patente) {
      return res.status(400).json({ message: 'municipioId, zonaNombre y patente son requeridos' })
    }

    const sessionId = `HL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const session = {
      id: sessionId,
      userId,
      municipioId,
      zonaNombre,
      patente,
      calle,
      lat,
      lng,
      inicio: new Date(),
      tarifaHora: 750, // Default, should come from zona
    }

    activeSessions.set(sessionId, session)

    res.json({ ok: true, session })
  } catch (error) {
    console.error('Start session error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

router.post('/:id/stop', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const session = activeSessions.get(id)

    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' })
    }

    const fin = new Date()
    const minutos = Math.max(1, Math.ceil((fin - session.inicio) / 60000))
    const MIN_GRATIS = 15
    const cobrables = Math.max(0, minutos - MIN_GRATIS)
    const monto = Math.round(cobrables * session.tarifaHora / 60)

    session.fin = fin
    session.montoTotal = monto
    session.comprobante = `HL-${Date.now()}`

    activeSessions.delete(id)

    res.json({
      ok: true,
      comprobante: session.comprobante,
      minutos,
      monto,
      tarifaHora: session.tarifaHora,
    })
  } catch (error) {
    console.error('Stop session error:', error)
    res.status(500).json({ message: 'Error al finalizar sesión' })
  }
})

router.get('/active', authenticate, (req, res) => {
  const userSessions = Array.from(activeSessions.values())
    .filter(s => s.userId === req.userId)

  res.json(userSessions)
})

export default router
