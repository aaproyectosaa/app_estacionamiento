import { create } from 'zustand'

export const useParkingStore = create((set, get) => ({
  municipios: [],
  municipioActual: null,
  datosZonas: null,
  sesionActiva: null,
  ubicacion: null,

  setMunicipios: (municipios) => set({ municipios }),
  setMunicipioActual: (id) => set({ municipioActual: id }),
  setDatosZonas: (datos) => set({ datosZonas: datos }),
  setSesionActiva: (sesion) => set({ sesionActiva: sesion }),
  setUbicacion: (ubicacion) => set({ ubicacion }),

  updatePlaza: (plazaId, ocupado, pago) => {
    const { datosZonas } = get()
    if (!datosZonas || !datosZonas.zonas) return

    const zonasActualizadas = datosZonas.zonas.map(z => {
      if (!z.plazas) return z
      const plazaIdx = z.plazas.findIndex(p => p.id === plazaId)
      if (plazaIdx >= 0) {
        const nuevasPlazas = [...z.plazas]
        nuevasPlazas[plazaIdx] = { ...nuevasPlazas[plazaIdx], ocupado, pago }
        const nuevosLibres = nuevasPlazas.reduce((s, p) => s + (p.ocupado ? 0 : 1), 0)
        return { ...z, plazas: nuevasPlazas, libres: nuevosLibres }
      }
      return z
    })

    set({ datosZonas: { ...datosZonas, zonas: zonasActualizadas } })
  },
}))
