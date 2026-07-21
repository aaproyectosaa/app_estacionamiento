import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { validate, sessionStartSchema } from '../middleware/validate.js'

const router = Router()

router.post('/start', authenticate, validate(sessionStartSchema), async (req, res) => {
  try {
    const { municipioId, zonaNombre, patente, calle, lat, lng } = req.body
    const userId = req.userId

    const prisma = req.app.locals.prisma

    const existing = await prisma.session.findFirst({
      where: { userId, fin: null },
    })

    if (existing) {
      return res.status(400).json({ message: 'Ya tenés una sesión activa. Finalizala antes de iniciar otra.' })
    }

    const municipio = await prisma.municipio.findUnique({
      where: { id: municipioId },
    })

    const tarifaHora = municipio?.tarifaHora || 750

    const session = await prisma.session.create({
      data: {
        userId,
        municipioId,
        zonaNombre,
        patente,
        calle: calle || '',
        inicio: new Date(),
        tarifaHora,
      },
    })

    res.json({ ok: true, session })
  } catch (error) {
    console.error('Start session error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

router.post('/:id/stop', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma

    const session = await prisma.session.findFirst({
      where: { id, userId: req.userId, fin: null },
    })

    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada o ya finalizada' })
    }

    const fin = new Date()
    const minutos = Math.max(1, Math.ceil((fin - session.inicio) / 60000))
    const MIN_GRATIS = 15
    const cobrables = Math.max(0, minutos - MIN_GRATIS)
    const monto = Math.round((cobrables * session.tarifaHora) / 60)
    const comprobante = `HL-${Date.now()}`

    const updated = await prisma.session.update({
      where: { id },
      data: {
        fin,
        montoTotal: monto,
        comprobante,
      },
    })

    res.json({
      ok: true,
      comprobante: updated.comprobante,
      minutos,
      monto,
      tarifaHora: updated.tarifaHora,
    })
  } catch (error) {
    console.error('Stop session error:', error)
    res.status(500).json({ message: 'Error al finalizar sesión' })
  }
})

router.get('/active', authenticate, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma

    const sessions = await prisma.session.findMany({
      where: { userId: req.userId, fin: null },
      orderBy: { inicio: 'desc' },
    })

    res.json(sessions)
  } catch (error) {
    console.error('Get active sessions error:', error)
    res.status(500).json({ message: 'Error al obtener sesiones activas' })
  }
})

router.get('/history', authenticate, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma

    const sessions = await prisma.session.findMany({
      where: { userId: req.userId, fin: { not: null } },
      orderBy: { fin: 'desc' },
      take: 50,
    })

    res.json(sessions)
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ message: 'Error al obtener historial' })
  }
})

export default router
