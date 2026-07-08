import { Router } from 'express'

const router = Router()

// Simulated zone data (same as original mock server)
const ZONAS_POR_MUNICIPIO = {
  rosario: [
    { nombre: 'Centro', ref: 'Zona bancaria y comercial', capacidad: 480, lat: -32.9468, lng: -60.6393, tarifa: 800 },
    { nombre: 'Microcentro Norte', ref: 'Peatonal y galerías', capacidad: 330, lat: -32.9388, lng: -60.6353, tarifa: 750 },
    { nombre: 'Zona Tribunales', ref: 'Juzgados y oficinas públicas', capacidad: 270, lat: -32.9528, lng: -60.6463, tarifa: 700 },
    { nombre: 'Costanera / Parque', ref: 'Paseo y gastronomía', capacidad: 210, lat: -32.9588, lng: -60.6293, tarifa: 650 },
  ],
  santafe: [
    { nombre: 'Centro', ref: 'Plaza principal y comercios', capacidad: 288, lat: -31.6333, lng: -60.7000, tarifa: 750 },
    { nombre: 'Zona comercial', ref: 'Avenida principal', capacidad: 192, lat: -31.6263, lng: -60.6950, tarifa: 700 },
    { nombre: 'Terminal', ref: 'Estación de ómnibus', capacidad: 144, lat: -31.6413, lng: -60.6940, tarifa: 650 },
  ],
  reconquista: [
    { nombre: 'Centro', ref: 'Plaza principal', capacidad: 90, lat: -29.1500, lng: -59.6500, tarifa: 550 },
    { nombre: 'Zona comercial', ref: 'Calle principal', capacidad: 60, lat: -29.1440, lng: -59.6450, tarifa: 500 },
  ],
}

function generatePlazas(capacidad) {
  const plazas = []
  const nCuadras = Math.ceil(capacidad / 15)
  for (let c = 0; c < nCuadras; c++) {
    const accesos = 2 + Math.floor(Math.random() * 4)
    const medidosCuadra = 20 - accesos
    const ocupacionInicial = 0.35 + Math.random() * 0.4
    for (let k = 0; k < medidosCuadra; k++) {
      plazas.push({
        cuadra: c,
        ocupado: Math.random() < ocupacionInicial,
        pago: false,
      })
    }
  }
  return plazas
}

// Initialize state
const estado = {}
Object.keys(ZONAS_POR_MUNICIPIO).forEach(mId => {
  estado[mId] = ZONAS_POR_MUNICIPIO[mId].map(z => ({
    ...z,
    plazas: generatePlazas(z.capacidad),
  }))
})

// Update state periodically (simulate real-time changes)
setInterval(() => {
  Object.values(estado).forEach(zonas => {
    zonas.forEach(z => {
      const mov = Math.max(1, Math.round(z.plazas.length * 0.025))
      for (let i = 0; i < mov; i++) {
        const p = z.plazas[Math.floor(Math.random() * z.plazas.length)]
        if (p.ocupado) {
          p.ocupado = false
          p.pago = false
        } else {
          p.ocupado = true
          p.pago = true
        }
      }
    })
  })
}, 4000)

router.get('/:municipioId', (req, res) => {
  const { municipioId } = req.params
  const zonas = estado[municipioId]

  if (!zonas) {
    return res.status(404).json({ message: 'Municipio no encontrado' })
  }

  const result = zonas.map(z => ({
    ...z,
    libres: z.plazas.reduce((s, p) => s + (p.ocupado ? 0 : 1), 0),
  }))

  res.json({
    municipio: municipioId,
    zonas: result,
    hora: new Date().toISOString(),
  })
})

export default router
