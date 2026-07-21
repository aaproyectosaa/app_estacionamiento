import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getCallesConGeometria, createCalleConGeometria, updateCalleGeometria } from '../lib/geo.js'

const router = Router()

router.get('/:municipioId', async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma
    const calles = await getCallesConGeometria(prisma, municipioId)
    res.json({ municipio: municipioId, calles })
  } catch (error) {
    console.error('Get calles error:', error)
    res.status(500).json({ message: 'Error al obtener calles' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const calle = await createCalleConGeometria(prisma, {
      ...req.body,
      medidaPor: req.userId,
    })
    res.status(201).json(calle)
  } catch (error) {
    console.error('Create calle error:', error)
    res.status(500).json({ message: 'Error al crear calle' })
  }
})

router.put('/:id/measure', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { coordenadas } = req.body
    const prisma = req.app.locals.prisma
    await updateCalleGeometria(prisma, id, coordenadas)
    res.json({ ok: true })
  } catch (error) {
    console.error('Measure calle error:', error)
    res.status(500).json({ message: 'Error al medir calle' })
  }
})

export default router
