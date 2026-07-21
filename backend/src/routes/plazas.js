import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { broadcastPlazaUpdate } from '../middleware/sse.js'

const router = Router()

router.post('/:id/ocupar', async (req, res) => {
  try {
    const { id } = req.params
    const { pago } = req.body
    const prisma = req.app.locals.prisma

    const plaza = await prisma.plaza.findUnique({ where: { id } })
    if (!plaza) {
      return res.status(404).json({ message: 'Plaza no encontrada' })
    }

    if (plaza.ocupado) {
      return res.status(400).json({ message: 'La plaza ya está ocupada' })
    }

    const updated = await prisma.plaza.update({
      where: { id },
      data: { ocupado: true, pago: pago !== false },
    })

    broadcastPlazaUpdate(updated.id, updated.ocupado, updated.pago, updated.zonaId)

    res.json({ ok: true, plaza: updated })
  } catch (error) {
    console.error('Ocupar plaza error:', error)
    res.status(500).json({ message: 'Error al ocupar la plaza' })
  }
})

router.post('/:id/liberar', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma

    const plaza = await prisma.plaza.findUnique({ where: { id } })
    if (!plaza) {
      return res.status(404).json({ message: 'Plaza no encontrada' })
    }

    const updated = await prisma.plaza.update({
      where: { id },
      data: { ocupado: false, pago: false },
    })

    broadcastPlazaUpdate(updated.id, updated.ocupado, updated.pago, updated.zonaId)

    res.json({ ok: true, plaza: updated })
  } catch (error) {
    console.error('Liberar plaza error:', error)
    res.status(500).json({ message: 'Error al liberar la plaza' })
  }
})

router.post('/:id/measure', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { lat, lng, angulo, cuadraId } = req.body
    const prisma = req.app.locals.prisma

    const plaza = await prisma.plaza.findUnique({ where: { id } })
    if (!plaza) {
      return res.status(404).json({ message: 'Plaza no encontrada' })
    }

    const data = {
      lat: Number(lat),
      lng: Number(lng),
      angulo: angulo !== undefined ? Number(angulo) : null,
      medido: true,
      medidaPor: req.userId,
      medidaEn: new Date(),
    }

    if (cuadraId) {
      data.cuadraId = cuadraId
    }

    const updated = await prisma.plaza.update({
      where: { id },
      data,
    })

    res.json({ ok: true, plaza: updated })
  } catch (error) {
    console.error('Measure plaza error:', error)
    res.status(500).json({ message: 'Error al medir la plaza' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const prisma = req.app.locals.prisma

    const plaza = await prisma.plaza.findUnique({
      where: { id },
      include: { zona: true },
    })

    if (!plaza) {
      return res.status(404).json({ message: 'Plaza no encontrada' })
    }

    res.json(plaza)
  } catch (error) {
    console.error('Get plaza error:', error)
    res.status(500).json({ message: 'Error al obtener la plaza' })
  }
})

export default router
