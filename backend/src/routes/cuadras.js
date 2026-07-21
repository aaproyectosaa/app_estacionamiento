import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getCuadrasConGeometria,
  getCuadrasPorMunicipio,
  getCuadrasMapData,
  createCuadraConGeometria,
  updateCuadraGeometria,
} from '../lib/geo.js'

const router = Router()

router.get('/municipio/:municipioId/map', async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma
    const cuadras = await getCuadrasMapData(prisma, municipioId)
    res.json({ municipio: municipioId, cuadras })
  } catch (error) {
    console.error('Get cuadras map error:', error)
    res.status(500).json({ message: 'Error al obtener cuadras para el mapa' })
  }
})

router.get('/municipio/:municipioId', async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma
    const cuadras = await getCuadrasPorMunicipio(prisma, municipioId)
    res.json({ municipio: municipioId, cuadras })
  } catch (error) {
    console.error('Get cuadras by municipio error:', error)
    res.status(500).json({ message: 'Error al obtener cuadras' })
  }
})

router.get('/:zonaId', async (req, res) => {
  try {
    const { zonaId } = req.params
    const prisma = req.app.locals.prisma
    const cuadras = await getCuadrasConGeometria(prisma, zonaId)
    res.json({ zona: zonaId, cuadras })
  } catch (error) {
    console.error('Get cuadras error:', error)
    res.status(500).json({ message: 'Error al obtener cuadras' })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma
    const cuadra = await createCuadraConGeometria(prisma, {
      ...req.body,
      medidaPor: req.userId,
    })
    res.status(201).json(cuadra)
  } catch (error) {
    console.error('Create cuadra error:', error)
    res.status(500).json({ message: 'Error al crear cuadra' })
  }
})

router.put('/:id/measure', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { coordenadas } = req.body
    const prisma = req.app.locals.prisma
    await updateCuadraGeometria(prisma, id, coordenadas)
    res.json({ ok: true })
  } catch (error) {
    console.error('Measure cuadra error:', error)
    res.status(500).json({ message: 'Error al medir cuadra' })
  }
})

export default router
