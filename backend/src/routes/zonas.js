import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { findPlazasCercanas } from '../lib/geo.js'

const router = Router()

let estado = {}
let inicializado = false
let simulacionActiva = false

async function initFromDB(prisma) {
  const municipios = await prisma.municipio.findMany({
    include: { zonas: { include: { plazas: true } } },
  })

  estado = {}

  for (const m of municipios) {
    estado[m.id] = m.zonas.map(z => ({
      nombre: z.nombre,
      ref: z.ref,
      capacidad: z.capacidad,
      lat: z.lat,
      lng: z.lng,
      tarifa: m.tarifaHora,
      plazas: z.plazas.map(p => ({
        id: p.id,
        cuadra: p.cuadra,
        ocupado: p.ocupado,
        pago: p.pago,
      })),
    }))
  }

  inicializado = true
}

function ensureInitialized(prisma) {
  if (!inicializado && prisma) {
    return initFromDB(prisma)
  }
  return Promise.resolve()
}

function iniciarSimulacion(prisma) {
  if (simulacionActiva) return
  simulacionActiva = true

  setInterval(async () => {
    const actualizaciones = []

    Object.entries(estado).forEach(([municipioId, zonas]) => {
      zonas.forEach(z => {
        if (!z.plazas || z.plazas.length === 0) return
        const mov = Math.max(1, Math.round(z.plazas.length * 0.025))
        for (let i = 0; i < mov; i++) {
          const p = z.plazas[Math.floor(Math.random() * z.plazas.length)]
          p.ocupado = !p.ocupado
          if (!p.ocupado) p.pago = false
          if (p.id) {
            actualizaciones.push(
              prisma.plaza.update({
                where: { id: p.id },
                data: { ocupado: p.ocupado, pago: p.pago },
              })
            )
          }
        }
      })
    })

    if (actualizaciones.length > 0) {
      await Promise.all(actualizaciones)
    }
  }, 4000)
}

router.get('/:municipioId', async (req, res) => {
  const { municipioId } = req.params
  const { include } = req.query
  const prisma = req.app.locals.prisma

  await ensureInitialized(prisma)
  iniciarSimulacion(prisma)

  const zonas = estado[municipioId]

  if (!zonas) {
    return res.status(404).json({ message: 'Municipio no encontrado' })
  }

  const includePlazas = include === 'plazas'

  const result = zonas.map(z => ({
    nombre: z.nombre,
    ref: z.ref,
    capacidad: z.capacidad,
    lat: z.lat,
    lng: z.lng,
    tarifa: z.tarifa,
    libres: (z.plazas || []).reduce((s, p) => s + (p.ocupado ? 0 : 1), 0),
    ...(includePlazas && { plazas: z.plazas || [] }),
  }))

  res.json({
    municipio: municipioId,
    zonas: result,
    hora: new Date().toISOString(),
  })
})

router.get('/:municipioId/plazas', async (req, res) => {
  const { municipioId } = req.params
  const prisma = req.app.locals.prisma

  await ensureInitialized(prisma)

  const zonas = estado[municipioId]
  if (!zonas) {
    return res.status(404).json({ message: 'Municipio no encontrado' })
  }

  const plazas = []
  zonas.forEach(z => {
    z.plazas.forEach(p => {
      plazas.push({
        id: p.id,
        zona: z.nombre,
        cuadra: p.cuadra,
        ocupado: p.ocupado,
        pago: p.pago,
      })
    })
  })

  res.json({ municipio: municipioId, plazas })
})

router.get('/:municipioId/measure', authenticate, async (req, res) => {
  try {
    const { municipioId } = req.params
    const prisma = req.app.locals.prisma

    const zonas = await prisma.zona.findMany({
      where: { municipioId },
      include: { plazas: true },
      orderBy: { nombre: 'asc' },
    })

    const result = zonas.map(z => {
      const total = z.plazas.length
      const medidas = z.plazas.filter(p => p.medido).length
      return {
        id: z.id,
        nombre: z.nombre,
        ref: z.ref,
        lat: z.lat,
        lng: z.lng,
        capacidad: z.capacidad,
        totalPlazas: total,
        medidas,
        pendientes: total - medidas,
        porcentaje: total > 0 ? Math.round((medidas / total) * 100) : 0,
        plazas: z.plazas.map(p => ({
          id: p.id,
          cuadra: p.cuadra,
          lat: p.lat,
          lng: p.lng,
          angulo: p.angulo,
          medido: p.medido,
          ocupado: p.ocupado,
        })),
      }
    })

    res.json({ municipio: municipioId, zonas: result })
  } catch (error) {
    console.error('Measure progress error:', error)
    res.status(500).json({ message: 'Error al obtener progreso de medición' })
  }
})

router.get('/:municipioId/nearby', async (req, res) => {
  try {
    const { municipioId } = req.params
    const { lat, lng, radio } = req.query
    const prisma = req.app.locals.prisma

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Se requieren lat y lng' })
    }

    const plazas = await findPlazasCercanas(
      prisma,
      Number(lat),
      Number(lng),
      municipioId,
      Number(radio) || 200
    )

    res.json({ municipio: municipioId, plazas })
  } catch (error) {
    console.error('Nearby error:', error)
    res.status(500).json({ message: 'Error al buscar plazas cercanas' })
  }
})

router.get('/:municipioId/export', authenticate, async (req, res) => {
  try {
    const { municipioId } = req.params
    const { format } = req.query
    const prisma = req.app.locals.prisma

    const zonas = await prisma.zona.findMany({
      where: { municipioId },
      include: { plazas: { where: { medido: true } } },
      orderBy: { nombre: 'asc' },
    })

    const plazasMedidas = []
    zonas.forEach(z => {
      z.plazas.forEach(p => {
        plazasMedidas.push({
          zona: z.nombre,
          cuadra: p.cuadra,
          lat: p.lat,
          lng: p.lng,
          angulo: p.angulo,
          ocupado: p.ocupado,
        })
      })
    })

    if (format === 'csv') {
      const header = 'zona,cuadra,lat,lng,angulo,ocupado'
      const rows = plazasMedidas.map(p =>
        `${p.zona},${p.cuadra},${p.lat},${p.lng},${p.angulo || ''},${p.ocupado}`
      )
      const csv = [header, ...rows].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=plazas-${municipioId}.csv`)
      return res.send(csv)
    }

    res.json({
      municipio: municipioId,
      totalMedidas: plazasMedidas.length,
      zonas: zonas.map(z => ({
        nombre: z.nombre,
        medidas: z.plazas.length,
      })),
      plazas: plazasMedidas,
    })
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ message: 'Error al exportar datos' })
  }
})

export default router
