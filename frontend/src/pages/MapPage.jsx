import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useParkingStore } from '../stores/parkingStore'
import { useAuthStore } from '../stores/authStore'

delete L.Icon.Default.prototype._getIconUrl

const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:52px;height:52px;border-radius:50%;background:${color};border:3px solid white;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:'Barlow Condensed',sans-serif;line-height:1;box-shadow:0 3px 6px rgba(12,30,60,.35)">
    <span style="font-size:22px;font-weight:700" class="n"></span>
    <span style="font-size:9px;font-weight:600;opacity:.9" class="l">libres</span>
  </div>`,
  iconSize: [52, 58],
  iconAnchor: [26, 58],
})

const iconVerde = createIcon('#0E9F4D')
const iconAmbar = createIcon('#E8A200')
const iconRojo = createIcon('#D6402B')

function getIcon(libres, capacidad) {
  const p = libres / capacidad
  if (p > 0.35) return iconVerde
  if (p > 0.12) return iconAmbar
  return iconRojo
}

export default function MapPage() {
  const navigate = useNavigate()
  const { municipios, municipioActual, datosZonas, setMunicipios, setMunicipioActual, setDatosZonas } = useParkingStore()
  const logout = useAuthStore(state => state.logout)
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMunicipios()
  }, [])

  useEffect(() => {
    if (municipioActual) {
      fetchZonas(municipioActual)
      const interval = setInterval(() => fetchZonas(municipioActual), 6000)
      return () => clearInterval(interval)
    }
  }, [municipioActual])

  const fetchMunicipios = async () => {
    try {
      const res = await fetch('/api/municipios')
      const data = await res.json()
      setMunicipios(data)
      if (data.length > 0) {
        setMunicipioActual(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching municipios:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchZonas = async (id) => {
    try {
      const res = await fetch(`/api/zonas/${id}`)
      const data = await res.json()
      setDatosZonas(data)
    } catch (err) {
      console.error('Error fetching zonas:', err)
    }
  }

  const totalLibres = datosZonas?.zonas?.reduce((s, z) => s + z.libres, 0) || 0
  const municipio = municipios.find(m => m.id === municipioActual)
  const center = municipio?.centro || [-31.6333, -60.7000]

  if (loading) {
    return (
      <div className="h-screen bg-niebla flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-azul rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gris">Cargando zonas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 p-3 flex flex-col gap-2 pointer-events-none">
        <div className="flex gap-2 items-stretch pointer-events-auto">
          <div className="bg-azul text-white rounded-2xl flex items-center gap-2 px-3 py-2 shadow-lg">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-azul font-bold text-lg font-[family-name:var(--font-family-condensed)]">E</span>
            </div>
            <strong className="font-[family-name:var(--font-family-condensed)] text-base font-bold uppercase tracking-wide">
              Hay Lugar
            </strong>
          </div>
          <select
            value={municipioActual || ''}
            onChange={(e) => setMunicipioActual(e.target.value)}
            className="flex-1 bg-white rounded-2xl px-3 py-2 text-sm font-semibold shadow-lg appearance-none cursor-pointer"
          >
            {municipios.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <div className="bg-white rounded-full px-4 py-2 shadow-lg text-sm font-semibold text-gris flex items-center gap-2">
            <span className="font-[family-name:var(--font-family-condensed)] font-bold text-2xl text-verde">{totalLibres}</span>
            lugares libres
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white rounded-full px-4 py-2 shadow-lg text-sm font-semibold text-azul"
          >
            Dashboard
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="bg-white rounded-full px-4 py-2 shadow-lg text-sm font-semibold text-gris"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {datosZonas?.zonas?.map((zona) => (
          <div key={zona.nombre}>
            <Circle
              center={[zona.lat, zona.lng]}
              radius={350}
              pathOptions={{ color: '#0B4EA2', weight: 1.5, opacity: 0.35, fillColor: '#0B4EA2', fillOpacity: 0.06 }}
              interactive={false}
            />
            <Marker
              position={[zona.lat, zona.lng]}
              icon={getIcon(zona.libres, zona.capacidad)}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-lg">{zona.nombre}</h3>
                  <p className="text-sm text-gray-500">{zona.ref}</p>
                  <p className="text-2xl font-bold text-azul mt-1">{zona.libres} libres</p>
                  <p className="text-sm">${zona.tarifa}/h</p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <button className="w-full max-w-md mx-auto block bg-asfalto text-white rounded-2xl py-4 px-5 font-[family-name:var(--font-family-condensed)] text-xl font-bold uppercase tracking-wide shadow-xl pointer-events-auto hover:bg-gray-800 transition-colors">
          Estacioné acá
        </button>
      </div>
    </div>
  )
}
