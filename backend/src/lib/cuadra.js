export const LARGO_VEHICULO_METROS = 4.5

export function calcularCapacidadCuadra({
  largoMetros,
  reservaMotos = 0,
  reservaRemises = 0,
  reservaDiscapacitados = 0,
  descuentoEsquinas = 0,
}) {
  if (!largoMetros || largoMetros <= 0) return 0
  const bruto = Math.floor(largoMetros / LARGO_VEHICULO_METROS)
  const reservas = reservaMotos + reservaRemises + reservaDiscapacitados + descuentoEsquinas
  return Math.max(0, bruto - reservas)
}

export function geoJsonCenter(geometria) {
  if (!geometria?.coordinates?.length) return null
  const coords = geometria.coordinates
  const mid = Math.floor(coords.length / 2)
  return { lat: coords[mid][1], lng: coords[mid][0] }
}

export function distanciaMetros(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function statsCuadra(cuadra, plazas = []) {
  const capacidad = cuadra.capacidad || plazas.length
  const libres = plazas.filter(p => !p.ocupado).length
  const ocupadas = plazas.filter(p => p.ocupado).length
  const conPago = plazas.filter(p => p.pago).length
  const centro = geoJsonCenter(cuadra.geometria)

  return {
    id: cuadra.id,
    zonaId: cuadra.zonaId,
    zonaNombre: cuadra.zonaNombre,
    nombre: cuadra.nombre,
    orden: cuadra.orden,
    medido: cuadra.medido,
    largoMetros: cuadra.largoMetros,
    capacidad,
    libres,
    ocupadas,
    conPago,
    reservaMotos: cuadra.reservaMotos,
    reservaRemises: cuadra.reservaRemises,
    reservaDiscapacitados: cuadra.reservaDiscapacitados,
    descuentoEsquinas: cuadra.descuentoEsquinas,
    lado: cuadra.lado,
    lat: centro?.lat ?? null,
    lng: centro?.lng ?? null,
    geometria: cuadra.geometria,
    plazas: plazas.map(p => ({
      id: p.id,
      ocupado: p.ocupado,
      pago: p.pago,
    })),
  }
}
