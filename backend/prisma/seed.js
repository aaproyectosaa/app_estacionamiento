import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import { calcularCapacidadCuadra } from '../src/lib/cuadra.js'

const prisma = new PrismaClient()

const DEMO_MUNICIPIO = {
  id: 'reconquista',
  nombre: 'Reconquista, Santa Fe',
  lat: -29.15,
  lng: -59.65,
  tarifaHora: 550,
}

const DEMO_ZONAS = [
  {
    nombre: 'Centro',
    ref: 'Plaza principal y zona bancaria',
    lat: -29.15,
    lng: -59.65,
    calles: [
      { nombre: 'San Martín', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Belgrano', offsetLat: -0.0018, offsetLng: 0.0008, dir: 'ns' },
      { nombre: 'Mitre', offsetLat: 0.0012, offsetLng: -0.001, dir: 'ew' },
    ],
    cuadras: [
      { nombre: 'San Martín al 800', largoMetros: 90, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 10, dir: 'ew', lado: 'par' },
      { nombre: 'Belgrano al 400', largoMetros: 81, motos: 2, remises: 0, disc: 1, esquinas: 2, libres: 9, dir: 'ns', lado: 'impar' },
      { nombre: 'Mitre al 600', largoMetros: 99, motos: 2, remises: 1, disc: 1, esquinas: 3, libres: 11, dir: 'ew', lado: 'ambos' },
      { nombre: 'San Martín al 1200', largoMetros: 72, motos: 1, remises: 1, disc: 1, esquinas: 2, libres: 5, dir: 'ew', lado: 'par' },
      { nombre: 'Belgrano al 800', largoMetros: 63, motos: 2, remises: 0, disc: 1, esquinas: 1, libres: 3, dir: 'ns', lado: 'impar' },
    ],
  },
  {
    nombre: 'Zona Comercial',
    ref: 'Calle Habegger y comercios',
    lat: -29.144,
    lng: -59.645,
    calles: [
      { nombre: 'Habegger', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Patricios', offsetLat: 0.0015, offsetLng: -0.001, dir: 'ns' },
    ],
    cuadras: [
      { nombre: 'Habegger al 300', largoMetros: 85, motos: 2, remises: 2, disc: 1, esquinas: 2, libres: 6, dir: 'ew', lado: 'par' },
      { nombre: 'Patricios al 500', largoMetros: 76, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 5, dir: 'ns', lado: 'impar' },
      { nombre: 'Habegger al 700', largoMetros: 68, motos: 1, remises: 1, disc: 1, esquinas: 2, libres: 4, dir: 'ew', lado: 'par' },
      { nombre: 'Patricios al 900', largoMetros: 54, motos: 2, remises: 0, disc: 1, esquinas: 1, libres: 2, dir: 'ns', lado: 'impar' },
    ],
  },
  {
    nombre: 'Terminal',
    ref: 'Estación de ómnibus y accesos',
    lat: -29.153,
    lng: -59.642,
    calles: [
      { nombre: 'Av. Irigoyen', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Lavalle', offsetLat: -0.001, offsetLng: 0.0006, dir: 'ns' },
    ],
    cuadras: [
      { nombre: 'Irigoyen al 1500', largoMetros: 72, motos: 2, remises: 2, disc: 1, esquinas: 2, libres: 4, dir: 'ew', lado: 'par' },
      { nombre: 'Lavalle al 200', largoMetros: 63, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 3, dir: 'ns', lado: 'impar' },
      { nombre: 'Irigoyen al 1800', largoMetros: 54, motos: 1, remises: 1, disc: 1, esquinas: 2, libres: 2, dir: 'ew', lado: 'par' },
    ],
  },
  {
    nombre: 'Hospital',
    ref: 'Centro de salud y consultorios',
    lat: -29.147,
    lng: -59.656,
    calles: [
      { nombre: 'Av. Costanera Sur', offsetLat: 0, offsetLng: 0, dir: 'ew' },
    ],
    cuadras: [
      { nombre: 'Costanera Sur al 400', largoMetros: 68, motos: 2, remises: 1, disc: 2, esquinas: 2, libres: 2, dir: 'ew', lado: 'par' },
      { nombre: 'Costanera Sur al 700', largoMetros: 54, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 1, dir: 'ew', lado: 'impar' },
    ],
  },
  {
    nombre: 'Barrio Norte',
    ref: 'Zona residencial y clubes',
    lat: -29.138,
    lng: -59.652,
    calles: [
      { nombre: 'Av. San Martín Norte', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Saavedra', offsetLat: 0.001, offsetLng: 0.0008, dir: 'ns' },
    ],
    cuadras: [
      { nombre: 'San Martín Norte al 100', largoMetros: 90, motos: 2, remises: 0, disc: 1, esquinas: 2, libres: 14, dir: 'ew', lado: 'par' },
      { nombre: 'Saavedra al 300', largoMetros: 81, motos: 2, remises: 0, disc: 1, esquinas: 2, libres: 12, dir: 'ns', lado: 'impar' },
      { nombre: 'San Martín Norte al 400', largoMetros: 72, motos: 1, remises: 0, disc: 1, esquinas: 2, libres: 11, dir: 'ew', lado: 'par' },
      { nombre: 'Saavedra al 600', largoMetros: 63, motos: 2, remises: 0, disc: 1, esquinas: 1, libres: 7, dir: 'ns', lado: 'impar' },
    ],
  },
  {
    nombre: 'Barrio Sur',
    ref: 'Acceso sur, feria y comercios',
    lat: -29.158,
    lng: -59.648,
    calles: [
      { nombre: 'Av. San Jerónimo', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Rivadavia', offsetLat: -0.0012, offsetLng: 0.0005, dir: 'ns' },
    ],
    cuadras: [
      { nombre: 'San Jerónimo al 500', largoMetros: 72, motos: 2, remises: 2, disc: 1, esquinas: 2, libres: 1, dir: 'ew', lado: 'par' },
      { nombre: 'Rivadavia al 800', largoMetros: 63, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 1, dir: 'ns', lado: 'impar' },
      { nombre: 'San Jerónimo al 900', largoMetros: 54, motos: 1, remises: 1, disc: 1, esquinas: 2, libres: 0, dir: 'ew', lado: 'par' },
    ],
  },
  {
    nombre: 'Universitaria',
    ref: 'Facultades y estudiantes',
    lat: -29.152,
    lng: -59.658,
    calles: [
      { nombre: 'Av. Almafuerte', offsetLat: 0, offsetLng: 0, dir: 'ew' },
      { nombre: 'Sarmiento', offsetLat: 0.0008, offsetLng: -0.0007, dir: 'ns' },
    ],
    cuadras: [
      { nombre: 'Almafuerte al 200', largoMetros: 81, motos: 2, remises: 1, disc: 1, esquinas: 2, libres: 8, dir: 'ew', lado: 'par' },
      { nombre: 'Sarmiento al 400', largoMetros: 72, motos: 2, remises: 0, disc: 1, esquinas: 2, libres: 7, dir: 'ns', lado: 'impar' },
      { nombre: 'Almafuerte al 600', largoMetros: 63, motos: 1, remises: 1, disc: 1, esquinas: 2, libres: 4, dir: 'ew', lado: 'par' },
    ],
  },
  {
    nombre: 'Costanera',
    ref: 'Paseo costero del río Corrientes',
    lat: -29.146,
    lng: -59.662,
    calles: [
      { nombre: 'Bvd. Costanera', offsetLat: 0, offsetLng: 0, dir: 'ew' },
    ],
    cuadras: [
      { nombre: 'Costanera al 100', largoMetros: 72, motos: 1, remises: 0, disc: 1, esquinas: 1, libres: 13, dir: 'ew', lado: 'par' },
      { nombre: 'Costanera al 400', largoMetros: 54, motos: 1, remises: 0, disc: 1, esquinas: 1, libres: 9, dir: 'ew', lado: 'impar' },
    ],
  },
]

function hashSeed(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleDeterministic(items, seed) {
  const arr = [...items]
  let state = seed
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function generateLineString(lat, lng, dir, offsetLat = 0, offsetLng = 0) {
  const clat = lat + offsetLat
  const clng = lng + offsetLng
  if (dir === 'ew') {
    return `LINESTRING(${clng - 0.015} ${clat}, ${clng + 0.015} ${clat})`
  }
  return `LINESTRING(${clng} ${clat - 0.012}, ${clng} ${clat + 0.012})`
}

function cuadraSegmentWkt(zonaLat, zonaLng, index, total, dir) {
  const escLng = 1 / Math.cos(zonaLat * Math.PI / 180)
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const r = 0.00055
  const centerLat = zonaLat + Math.sin(angle) * r
  const centerLng = zonaLng + Math.cos(angle) * r * escLng
  const halfLen = 0.00055

  if (dir === 'ew') {
    return `LINESTRING(${centerLng - halfLen} ${centerLat}, ${centerLng + halfLen} ${centerLat})`
  }
  return `LINESTRING(${centerLng} ${centerLat - halfLen}, ${centerLng} ${centerLat + halfLen})`
}

function buildPlazasCuadra(cuadraCfg, cuadraId, zonaId, cuadraIdx, zona, capacidad) {
  const libres = Math.min(cuadraCfg.libres, capacidad)
  const ocupadas = capacidad - libres
  const estados = [
    ...Array.from({ length: libres }, () => ({ ocupado: false, pago: false })),
    ...Array.from({ length: ocupadas }, (_, i) => ({
      ocupado: true,
      pago: i % 3 !== 0,
    })),
  ]
  const shuffled = shuffleDeterministic(estados, hashSeed(`${zona.nombre}-${cuadraCfg.nombre}`))
  const total = zona.cuadras.length
  const escLng = 1 / Math.cos(zona.lat * Math.PI / 180)
  const angle = (cuadraIdx / total) * Math.PI * 2 - Math.PI / 2
  const r = 0.00055
  const baseLat = zona.lat + Math.sin(angle) * r
  const baseLng = zona.lng + Math.cos(angle) * r * escLng

  return shuffled.map((estado, slot) => ({
    zonaId,
    cuadraId,
    cuadra: cuadraIdx,
    lat: baseLat + slot * 0.000018,
    lng: baseLng + slot * 0.000028,
    angulo: cuadraCfg.dir === 'ew' ? 90 : 0,
    medido: true,
    medidaPor: 'seed-demo',
    medidaEn: new Date(),
    ...estado,
  }))
}

async function resetDemoData() {
  console.log('  Limpiando datos de demo anteriores...')
  await prisma.plaza.deleteMany({})
  await prisma.cuadra.deleteMany({})
  await prisma.zona.deleteMany({})
  await prisma.calle.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.report.deleteMany({})
  await prisma.acta.deleteMany({})
  await prisma.municipio.deleteMany({})
}

async function createCalle(municipioId, calleCfg, zona) {
  const wkt = generateLineString(
    zona.lat, zona.lng, calleCfg.dir, calleCfg.offsetLat, calleCfg.offsetLng
  )
  const calleId = `calle_${crypto.randomUUID().slice(0, 8)}`
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Calle" (id, "municipioId", nombre, geometria, medido, "medidaPor", "medidaEn", "updatedAt")
    VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, NOW(), NOW())
  `, calleId, municipioId, calleCfg.nombre, `SRID=4326;${wkt}`, true, 'seed-demo')
  return { id: calleId, ...calleCfg }
}

async function createCuadra(zona, calleId, cfg, index, total) {
  const capacidad = calcularCapacidadCuadra({
    largoMetros: cfg.largoMetros,
    reservaMotos: cfg.motos,
    reservaRemises: cfg.remises,
    reservaDiscapacitados: cfg.disc,
    descuentoEsquinas: cfg.esquinas,
  })
  const wkt = cuadraSegmentWkt(zona.lat, zona.lng, index, total, cfg.dir)
  const cuadraId = `cuadra_${crypto.randomUUID().slice(0, 8)}`

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Cuadra" (
      id, "zonaId", "calleId", nombre, orden, geometria,
      "largoMetros", capacidad,
      "reservaMotos", "reservaRemises", "reservaDiscapacitados", "descuentoEsquinas",
      lado, medido, "medidaPor", "medidaEn", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7, $8, $9, $10, $11, $12, $13, true, 'seed-demo', NOW(), NOW())
  `,
    cuadraId, zona.id, calleId, cfg.nombre, index,
    `SRID=4326;${wkt}`,
    cfg.largoMetros, capacidad,
    cfg.motos, cfg.remises, cfg.disc, cfg.esquinas,
    cfg.lado
  )

  return { id: cuadraId, capacidad, cfg }
}

function estadoColor(capacidad, libres) {
  const p = libres / capacidad
  if (p > 0.35) return 'verde'
  if (p > 0.12) return 'ambar'
  return 'rojo'
}

async function main() {
  console.log(`Seeding demo — ${DEMO_MUNICIPIO.nombre}`)
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis`)
  await resetDemoData()

  const municipio = await prisma.municipio.create({
    data: { ...DEMO_MUNICIPIO },
  })
  console.log(`\n  Municipio: ${municipio.nombre}`)

  const callesPorNombre = new Map()
  for (const z of DEMO_ZONAS) {
    for (const calleCfg of z.calles) {
      if (callesPorNombre.has(calleCfg.nombre)) continue
      const calle = await createCalle(municipio.id, calleCfg, z)
      callesPorNombre.set(calleCfg.nombre, calle)
    }
  }

  let totalPlazas = 0
  let totalLibres = 0
  let totalCuadras = 0

  console.log('\n  Zonas y cuadras:')

  for (const z of DEMO_ZONAS) {
    const calleRef = callesPorNombre.get(z.calles[0].nombre)
    let zonaCap = 0
    const cuadraRows = []

    for (let i = 0; i < z.cuadras.length; i++) {
      const cap = calcularCapacidadCuadra({
        largoMetros: z.cuadras[i].largoMetros,
        reservaMotos: z.cuadras[i].motos,
        reservaRemises: z.cuadras[i].remises,
        reservaDiscapacitados: z.cuadras[i].disc,
        descuentoEsquinas: z.cuadras[i].esquinas,
      })
      zonaCap += cap
      cuadraRows.push({ cfg: z.cuadras[i], capacidad: cap })
    }

    const zona = await prisma.zona.create({
      data: {
        municipioId: municipio.id,
        nombre: z.nombre,
        ref: z.ref,
        lat: z.lat,
        lng: z.lng,
        capacidad: zonaCap,
      },
    })

    const allPlazas = []
    for (let i = 0; i < cuadraRows.length; i++) {
      const { cfg, capacidad } = cuadraRows[i]
      const row = await createCuadra({ ...z, id: zona.id }, calleRef.id, cfg, i, z.cuadras.length)
      cuadraRows[i].id = row.id

      const plazas = buildPlazasCuadra(cfg, row.id, zona.id, i, z, capacidad)
      allPlazas.push(...plazas)
    }

    await prisma.plaza.createMany({ data: allPlazas })

    const libres = allPlazas.filter(p => !p.ocupado).length
    totalPlazas += allPlazas.length
    totalLibres += libres
    totalCuadras += cuadraRows.length

    console.log(`    ${z.nombre} — ${libres}/${zonaCap} libres (${estadoColor(zonaCap, libres)})`)
    for (let i = 0; i < cuadraRows.length; i++) {
      const cap = cuadraRows[i].capacidad
      const lib = Math.min(cuadraRows[i].cfg.libres, cap)
      const cfg = cuadraRows[i].cfg
      console.log(
        `      · ${cfg.nombre.padEnd(24)} ${String(lib).padStart(2)}/${String(cap).padStart(2)} · ${cfg.largoMetros}m · -${cfg.motos}M -${cfg.remises}R -${cfg.disc}D`
      )
    }
  }

  console.log('\n  Resumen:')
  console.log(`    ${DEMO_ZONAS.length} zonas · ${totalCuadras} cuadras medidas`)
  console.log(`    ${totalPlazas} plazas (${totalLibres} libres)`)
  console.log('    Acercate en el mapa (zoom ≥15) para ver cuadras con ocupación')
  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
