import { create } from 'zustand'

export const useParkingStore = create((set) => ({
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
}))
