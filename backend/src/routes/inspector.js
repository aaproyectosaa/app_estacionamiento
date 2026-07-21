import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, requireRole('inspector'))

router.get('/me', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, legajo: true, role: true },
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener datos del inspector' })
  }
})

router.post('/actas', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const { municipioId, patente, motivo, calle, fotoUrl, montoMulta, observaciones, lat, lng } = req.body

    if (!patente?.trim()) return res.status(400).json({ message: 'La patente es requerida' })
    if (!motivo?.trim()) return res.status(400).json({ message: 'El motivo es requerido' })

    const count = await prisma.acta.count()
    const comprobante = `ACTA-${String(count + 1).padStart(6, '0')}`

    const activeSession = await prisma.session.findFirst({
      where: {
        patente: { equals: patente.trim(), mode: 'insensitive' },
        fin: null,
      },
    })

    if (activeSession) {
      return res.json({
        estado: 'pagando',
        comprobante: null,
        mensaje: `La patente ${patente.trim().toUpperCase()} tiene sesión activa en ${activeSession.zonaNombre}. No se emite acta.`,
      })
    }

    const acta = await prisma.acta.create({
      data: {
        inspectorId: req.userId,
        municipioId: municipioId || 'santafe',
        patente: patente.trim().toUpperCase(),
        motivo: motivo.trim(),
        calle: calle?.trim() || '',
        fotoUrl: fotoUrl || null,
        montoMulta: montoMulta ? Number(montoMulta) : null,
        observaciones: observaciones?.trim() || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        comprobante,
      },
    })

    res.status(201).json({
      estado: 'infraccion',
      comprobante,
      acta,
      mensaje: `Acta ${comprobante} emitida para la patente ${patente.trim().toUpperCase()}.`,
    })
  } catch (error) {
    console.error('Inspector create acta error:', error)
    res.status(500).json({ message: 'Error al emitir acta' })
  }
})

router.get('/actas', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const { page = 1, limit = 50 } = req.query

    const [actas, total] = await Promise.all([
      prisma.acta.findMany({
        where: { inspectorId: req.userId },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.acta.count({ where: { inspectorId: req.userId } }),
    ])

    res.json({ actas, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (error) {
    console.error('Inspector get actas error:', error)
    res.status(500).json({ message: 'Error al obtener actas' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma

    const [totalActas, actasHoy, totalMultas] = await Promise.all([
      prisma.acta.count({ where: { inspectorId: req.userId } }),
      prisma.acta.count({
        where: {
          inspectorId: req.userId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.acta.aggregate({
        where: { inspectorId: req.userId },
        _sum: { montoMulta: true },
      }),
    ])

    res.json({
      totalActas,
      actasHoy,
      totalMultas: totalMultas._sum.montoMulta || 0,
    })
  } catch (error) {
    console.error('Inspector stats error:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas' })
  }
})

router.get('/verificar/:patente', async (req, res) => {
  try {
    const { patente } = req.params
    const prisma = req.app.locals.prisma

    const session = await prisma.session.findFirst({
      where: {
        patente: { equals: patente.trim(), mode: 'insensitive' },
        fin: null,
      },
      include: { user: { select: { name: true } } },
    })

    if (session) {
      const elapsed = Math.ceil((Date.now() - session.inicio.getTime()) / 60000)
      return res.json({
        estado: 'pagando',
        zona: session.zonaNombre,
        desde: session.inicio,
        minutos: elapsed,
        usuario: session.user?.name,
      })
    }

    const lastSession = await prisma.session.findFirst({
      where: { patente: { equals: patente.trim(), mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    })

    if (lastSession && !lastSession.fin) {
      return res.json({ estado: 'activa', zona: lastSession.zonaNombre })
    }

    res.json({ estado: 'sin_pago' })
  } catch (error) {
    console.error('Inspector verificar patente error:', error)
    res.status(500).json({ message: 'Error al verificar patente' })
  }
})

export default router
