export function coordsToLineString(coords) {
  if (!coords || coords.length < 2) return null
  const points = coords.map(c => `${c[1]} ${c[0]}`).join(', ')
  return `SRID=4326;LINESTRING(${points})`
}

export function lineStringToCoords(wkt) {
  if (!wkt) return []
  const m = wkt.match(/LINESTRING\((.+)\)/i)
  if (!m) return []
  return m[1].split(',').map(p => {
    const [lng, lat] = p.trim().split(' ').map(Number)
    return [lat, lng]
  })
}

export async function ensurePostGIS(prisma) {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis`)
  } catch (err) {
    console.warn('PostGIS extension check failed:', err.message)
  }
}

export async function getCallesConGeometria(prisma, municipioId) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      c.id, c."municipioId", c.nombre, c.medido, c."medidaPor", c."medidaEn",
      c."createdAt", c."updatedAt",
      ST_AsGeoJSON(c.geometria) AS geometria
    FROM "Calle" c
    WHERE c."municipioId" = $1
    ORDER BY c.nombre
  `, municipioId)
  return rows.map(r => ({
    ...r,
    geometria: r.geometria ? JSON.parse(r.geometria) : null,
  }))
}

export async function getCuadrasConGeometria(prisma, zonaId) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      c.id, c."zonaId", c."calleId", c.nombre, c.orden, c.medido, c."medidaPor", c."medidaEn",
      c."createdAt", c."updatedAt",
      ST_AsGeoJSON(c.geometria) AS geometria
    FROM "Cuadra" c
    WHERE c."zonaId" = $1
    ORDER BY c.orden
  `, zonaId)
  return rows.map(r => ({
    ...r,
    geometria: r.geometria ? JSON.parse(r.geometria) : null,
  }))
}

export async function createCalleConGeometria(prisma, data) {
  const wkt = coordsToLineString(data.coordenadas)
  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO "Calle" ("municipioId", nombre, geometria, medido, "medidaPor", "medidaEn")
    VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6)
    RETURNING id, "municipioId", nombre, medido, "medidaPor", "medidaEn",
      ST_AsGeoJSON(geometria) AS geometria
  `, data.municipioId, data.nombre, wkt, data.medido || false, data.medidaPor || null, data.medidaEn || null)
  return {
    ...result[0],
    geometria: result[0].geometria ? JSON.parse(result[0].geometria) : null,
  }
}

export async function updateCalleGeometria(prisma, id, coordenadas) {
  const wkt = coordsToLineString(coordenadas)
  await prisma.$executeRawUnsafe(`
    UPDATE "Calle"
    SET geometria = ST_GeomFromText($1, 4326),
        medido = true,
        "medidaEn" = NOW()
    WHERE id = $2
  `, wkt, id)
}

export async function createCuadraConGeometria(prisma, data) {
  const wkt = coordsToLineString(data.coordenadas)
  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO "Cuadra" ("zonaId", "calleId", nombre, orden, geometria, medido, "medidaPor", "medidaEn")
    VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), $6, $7, $8)
    RETURNING id, "zonaId", "calleId", nombre, orden, medido, "medidaPor", "medidaEn",
      ST_AsGeoJSON(geometria) AS geometria
  `, data.zonaId, data.calleId || null, data.nombre, data.orden, wkt,
    data.medido || false, data.medidaPor || null, data.medidaEn || null)
  return {
    ...result[0],
    geometria: result[0].geometria ? JSON.parse(result[0].geometria) : null,
  }
}

export async function updateCuadraGeometria(prisma, id, coordenadas) {
  const wkt = coordsToLineString(coordenadas)
  await prisma.$executeRawUnsafe(`
    UPDATE "Cuadra"
    SET geometria = ST_GeomFromText($1, 4326),
        medido = true,
        "medidaEn" = NOW()
    WHERE id = $2
  `, wkt, id)
}

export async function getCuadrasPorMunicipio(prisma, municipioId) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      c.id, c."zonaId", c."calleId", c.nombre, c.orden, c.medido,
      c."largoMetros", c.capacidad,
      c."reservaMotos", c."reservaRemises", c."reservaDiscapacitados",
      c."descuentoEsquinas", c.lado,
      c."createdAt", c."updatedAt",
      ST_AsGeoJSON(c.geometria) AS geometria,
      z.nombre AS "zonaNombre"
    FROM "Cuadra" c
    JOIN "Zona" z ON z.id = c."zonaId"
    WHERE z."municipioId" = $1
    ORDER BY z.nombre, c.orden
  `, municipioId)
  return rows.map(r => ({
    ...r,
    geometria: r.geometria ? JSON.parse(r.geometria) : null,
  }))
}

export async function getCuadrasMapData(prisma, municipioId) {
  const cuadras = await getCuadrasPorMunicipio(prisma, municipioId)
  if (cuadras.length === 0) return []

  const cuadraIds = cuadras.map(c => c.id)
  const plazas = await prisma.plaza.findMany({
    where: { cuadraId: { in: cuadraIds } },
    select: { id: true, cuadraId: true, ocupado: true, pago: true },
  })

  const plazasPorCuadra = new Map()
  for (const p of plazas) {
    if (!p.cuadraId) continue
    if (!plazasPorCuadra.has(p.cuadraId)) plazasPorCuadra.set(p.cuadraId, [])
    plazasPorCuadra.get(p.cuadraId).push(p)
  }

  const { statsCuadra } = await import('./cuadra.js')
  return cuadras.map(c => statsCuadra(c, plazasPorCuadra.get(c.id) || []))
}

export async function findPlazasCercanas(prisma, lat, lng, municipioId, radioMetros = 200) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      p.id, p."zonaId", p.cuadra, p.ocupado, p.pago, p.lat, p.lng, p.angulo,
      z.nombre AS "zonaNombre",
      ST_DistanceSphere(
        ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326),
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      ) AS distancia
    FROM "Plaza" p
    JOIN "Zona" z ON z.id = p."zonaId"
    WHERE p.ocupado = false
      AND p.lat IS NOT NULL
      AND p.lng IS NOT NULL
      AND z."municipioId" = $3
      AND ST_DistanceSphere(
        ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326),
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      ) <= $4
    ORDER BY distancia
    LIMIT 20
  `, lng, lat, municipioId, radioMetros)
  return rows
}
