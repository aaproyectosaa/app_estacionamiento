import { Router } from 'express'

const router = Router()

router.get('/', async (req, res) => {
  const municipios = await req.app.locals.prisma.municipio.findMany({
    orderBy: { nombre: 'asc' },
  })

  const mapped = municipios.map(m => ({
    id: m.id,
    nombre: m.nombre,
    centro: [m.lat, m.lng],
    tarifaHora: m.tarifaHora,
  }))

  res.json(mapped)
})

router.get('/:id', async (req, res) => {
  const m = await req.app.locals.prisma.municipio.findUnique({
    where: { id: req.params.id },
  })

  if (!m) {
    return res.status(404).json({ message: 'Municipio no encontrado' })
  }

  res.json({
    id: m.id,
    nombre: m.nombre,
    centro: [m.lat, m.lng],
    tarifaHora: m.tarifaHora,
  })
})

export default router
