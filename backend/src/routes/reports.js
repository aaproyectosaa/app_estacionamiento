import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { validate, reportSchema } from '../middleware/validate.js'

const router = Router()

let actaCounter = 1000
let inicializadoActa = false

async function initActaCounter(prisma) {
  const last = await prisma.report.findFirst({
    where: { actaNumero: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { actaNumero: true },
  })
  if (last?.actaNumero) {
    const num = parseInt(last.actaNumero.replace(/\D/g, ''), 10)
    if (!isNaN(num) && num > actaCounter) {
      actaCounter = num
    }
  }
}

router.post('/', authenticate, validate(reportSchema), async (req, res) => {
  try {
    const { municipioId, zonaNombre, patente, comentario, fotoUrl } = req.body
    const userId = req.userId
    const prisma = req.app.locals.prisma

    if (!inicializadoActa) {
      await initActaCounter(prisma)
      inicializadoActa = true
    }

    const activeSession = await prisma.session.findFirst({
      where: {
        patente: { equals: patente, mode: 'insensitive' },
        fin: null,
      },
    })

    if (activeSession) {
      const now = new Date()
      const min = Math.max(1, Math.ceil((now - activeSession.inicio) / 60000))

      await prisma.report.create({
        data: {
          userId,
          municipioId,
          zonaNombre,
          patente,
          comentario,
          fotoUrl,
          estado: 'verificado',
        },
      })

      return res.json({
        estado: 'pagando',
        mensaje: `La patente ${patente} tiene una sesión activa en ${activeSession.zonaNombre} desde hace ${min} minutos. Está todo en orden.`,
      })
    }

    const actaNumero = `ACTA-SF-${++actaCounter}`

    await prisma.report.create({
      data: {
        userId,
        municipioId,
        zonaNombre,
        patente,
        comentario,
        fotoUrl,
        estado: 'infraccion',
        actaNumero,
      },
    })

    res.json({
      estado: 'infraccion',
      acta: actaNumero,
      mensaje: `La patente ${patente} no registra pago activo en ${zonaNombre}. Se generó el acta ${actaNumero} y se notificó al cuerpo de inspectores del municipio para verificar en el lugar.`,
    })
  } catch (error) {
    console.error('Report error:', error)
    res.status(500).json({ message: 'Error al procesar reporte' })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma

    const reports = await prisma.report.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json(reports)
  } catch (error) {
    console.error('Get reports error:', error)
    res.status(500).json({ message: 'Error al obtener reportes' })
  }
})

export default router
