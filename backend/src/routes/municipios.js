import { Router } from 'express'

const router = Router()

const MUNICIPIOS = [
  { id: 'rosario', nombre: 'Rosario, Santa Fe', centro: [-32.9468, -60.6393], tarifaHora: 800 },
  { id: 'santafe', nombre: 'Santa Fe Capital, Santa Fe', centro: [-31.6333, -60.7000], tarifaHora: 750 },
  { id: 'rafaela', nombre: 'Rafaela, Santa Fe', centro: [-31.2503, -61.4867], tarifaHora: 650 },
  { id: 'venadotuerto', nombre: 'Venado Tuerto, Santa Fe', centro: [-33.7458, -61.9689], tarifaHora: 600 },
  { id: 'reconquista', nombre: 'Reconquista, Santa Fe', centro: [-29.1500, -59.6500], tarifaHora: 550 },
]

router.get('/', (req, res) => {
  res.json(MUNICIPIOS)
})

router.get('/:id', (req, res) => {
  const municipio = MUNICIPIOS.find(m => m.id === req.params.id)
  if (!municipio) {
    return res.status(404).json({ message: 'Municipio no encontrado' })
  }
  res.json(municipio)
})

export default router
