import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIProvider, Map, AdvancedMarker, useMap, Circle as GoogleCircle, Polyline as GooglePolyline } from '@vis.gl/react-google-maps'
import { useParkingStore } from '../stores/parkingStore'
import { useAuthStore } from '../stores/authStore'
import { notifyError, notifySuccess, showDialog } from '../lib/notify'
import { useSSE } from '../hooks/useSSE'
import { Settings, Zap, AlertTriangle, Car, ParkingCircle } from 'lucide-react'
import '../styles/map.css'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function colorClass(libres, capacidad) {
  const p = libres / capacidad
  if (p > 0.35) return 'verde'
  if (p > 0.12) return 'ambar'
  return 'rojo'
}

function ZoneMarker({ zona, onClick }) {
  return (
    <AdvancedMarker
      position={{ lat: zona.lat, lng: zona.lng }}
      onClick={() => onClick(zona)}
      title={`${zona.nombre} — ${zona.libres} libres`}
    >
      <div className={`marcador-zona-google ${colorClass(zona.libres, zona.capacidad)}`}>
        <div className="globo">
          <span className="n">{zona.libres}</span>
          <span className="l">libres</span>
        </div>
        <div className="pico" />
      </div>
    </AdvancedMarker>
  )
}

function NearbyDot({ plaza }) {
  if (!plaza.lat || !plaza.lng) return null
  return (
    <AdvancedMarker position={{ lat: plaza.lat, lng: plaza.lng }} zIndex={500}>
      <div className="plaza-cerca-dot" />
    </AdvancedMarker>
  )
}

function UserMarker({ position }) {
  if (!position) return null
  return (
    <AdvancedMarker position={position} zIndex={1000}>
      <div className="marcador-usuario">
        <div className="pulso" />
        <div className="punto" />
      </div>
    </AdvancedMarker>
  )
}

function ZoneCircle({ zona }) {
  return (
    <GoogleCircle
      center={{ lat: zona.lat, lng: zona.lng }}
      radius={350}
      options={{
        strokeColor: '#0B4EA2',
        strokeOpacity: 0.35,
        strokeWeight: 1.5,
        fillColor: '#0B4EA2',
        fillOpacity: 0.06,
        clickable: false,
      }}
    />
  )
}

const ZOOM_CUADRAS = 15

function distanciaMetros(a, b) {
  if (!a?.lat || !b?.lat) return Infinity
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function textoDistancia(m) {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

function colorCuadra(libres, capacidad) {
  return colorClass(libres, capacidad)
}

function MapController({ onMapReady, onZoomChange }) {
  const map = useMap()
  useEffect(() => {
    if (map) onMapReady(map)
  }, [map, onMapReady])

  useEffect(() => {
    if (!map || !onZoomChange) return
    const syncZoom = () => onZoomChange(map.getZoom())
    syncZoom()
    const listener = map.addListener('zoom_changed', syncZoom)
    return () => listener.remove()
  }, [map, onZoomChange])

  return null
}

function CuadraMarker({ cuadra, onClick, selected }) {
  if (!cuadra.lat || !cuadra.lng) return null
  const cl = colorCuadra(cuadra.libres, cuadra.capacidad)
  return (
    <AdvancedMarker
      position={{ lat: cuadra.lat, lng: cuadra.lng }}
      onClick={() => onClick(cuadra)}
      zIndex={selected ? 700 : 600}
      title={`${cuadra.nombre} — ${cuadra.libres} libres`}
    >
      <div className={`marcador-cuadra ${cl}${selected ? ' seleccionada' : ''}`}>
        <span className="n">{cuadra.libres}</span>
        <span className="l">libres</span>
      </div>
    </AdvancedMarker>
  )
}

function CuadraPolyline({ cuadra, selected }) {
  const coords = cuadra.geometria?.coordinates?.map(c => ({ lat: c[1], lng: c[0] }))
  if (!coords?.length) return null
  const cl = colorCuadra(cuadra.libres, cuadra.capacidad)
  const colors = { verde: '#0E9F4D', ambar: '#E8A200', rojo: '#D6402B' }
  return (
    <GooglePolyline
      path={coords}
      options={{
        strokeColor: colors[cl] || '#0B4EA2',
        strokeOpacity: selected ? 0.95 : 0.75,
        strokeWeight: selected ? 7 : 5,
        clickable: false,
        zIndex: selected ? 2 : 1,
      }}
    />
  )
}

function ParkingSpotsVisual({ plazas, capacidad, libres }) {
  const total = Math.min(capacidad, 20)
  const items = plazas?.length
    ? plazas.slice(0, total)
    : Array.from({ length: total }, (_, i) => ({ ocupado: i >= Math.round((libres / capacidad) * total) }))

  return (
    <div className="cuadra-vista">
      {items.map((p, i) =>
        !p.ocupado ? (
          <div key={i} className="plaza libre" title="Lugar libre" />
        ) : (
          <div key={i} className="plaza ocupada" title="Lugar ocupado"><Car size={14} /></div>
        )
      )}
    </div>
  )
}

export default function MapPage() {
  const {
    municipios, municipioActual, datosZonas, sesionActiva,
    setMunicipios, setMunicipioActual, setDatosZonas, setSesionActiva,
  } = useParkingStore()
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [conductorZonaNombre, setConductorZonaNombre] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [elapsedMin, setElapsedMin] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [nearbyPlazas, setNearbyPlazas] = useState(null)
  const [buscandoCerca, setBuscandoCerca] = useState(false)
  const [cuadras, setCuadras] = useState([])
  const [mapZoom, setMapZoom] = useState(14)
  const [showCuadrasView, setShowCuadrasView] = useState(false)
  const [cuadraSeleccionada, setCuadraSeleccionada] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [mapType, setMapType] = useState('roadmap')
  const timerRef = useRef(null)
  const prevMunicipioRef = useRef(null)

  const handleRecenter = useCallback(() => {
    if (!mapInstance) return
    if (userPosition) {
      mapInstance.panTo(userPosition)
      mapInstance.setZoom(15)
      return
    }
    const m = municipios.find(x => x.id === municipioActual)
    if (m?.centro) {
      mapInstance.panTo({ lat: m.centro[0], lng: m.centro[1] })
      mapInstance.setZoom(14)
    }
  }, [mapInstance, municipios, municipioActual, userPosition])

  const handleZoomIn = useCallback(() => {
    if (!mapInstance) return
    const z = mapInstance.getZoom()
    mapInstance.setZoom(Math.min(z + 1, 20))
  }, [mapInstance])

  const handleZoomOut = useCallback(() => {
    if (!mapInstance) return
    const z = mapInstance.getZoom()
    mapInstance.setZoom(Math.max(z - 1, 3))
  }, [mapInstance])

  const toggleMapType = useCallback(() => {
    setMapType(t => (t === 'roadmap' ? 'satellite' : 'roadmap'))
  }, [])

  const { connected: sseConnected } = useSSE()

  const fetchMunicipios = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/municipios')
      if (!res.ok) throw new Error('Error al cargar municipios')
      const data = await res.json()
      setMunicipios(data)
      if (data.length > 0 && !municipioActual) {
        setMunicipioActual(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [municipioActual, setMunicipios, setMunicipioActual])

  const fetchZonas = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/zonas/${id}?include=plazas`)
      if (!res.ok) throw new Error('Error al cargar zonas')
      const data = await res.json()
      setDatosZonas(data)
    } catch (err) {
      console.error('Error fetching zonas:', err)
    }
  }, [setDatosZonas])

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/active', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSesionActiva(data.length > 0 ? data[0] : null)
      }
    } catch { /* ignore */ }
  }, [token, setSesionActiva])

  useEffect(() => { fetchMunicipios() }, [fetchMunicipios])
  useEffect(() => { fetchActiveSession() }, [fetchActiveSession])

  useEffect(() => {
    if (municipioActual) {
      fetchZonas(municipioActual)
      fetch(`/api/cuadras/municipio/${municipioActual}/map`)
        .then(r => r.json())
        .then(d => setCuadras(d.cuadras || []))
        .catch(() => setCuadras([]))
    }
  }, [municipioActual, fetchZonas])

  const municipioCoords = useMemo(() => {
    const m = municipios.find(x => x.id === municipioActual)
    return m?.centro ? { lat: m.centro[0], lng: m.centro[1] } : null
  }, [municipios, municipioActual])

  useEffect(() => {
    if (!mapInstance || !municipioCoords) return
    if (prevMunicipioRef.current !== municipioActual) {
      mapInstance.panTo(municipioCoords)
      mapInstance.setZoom(14)
      prevMunicipioRef.current = municipioActual
    }
  }, [mapInstance, municipioActual, municipioCoords])

  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const handleStartSession = async () => {
    if (!zonaSeleccionada) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          municipioId: municipioActual,
          zonaNombre: zonaSeleccionada.nombre,
          patente: user?.patente || '',
          calle: cuadraSeleccionada?.nombre || '',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Error al iniciar sesión')
      }
      const data = await res.json()
      setSesionActiva(data.session)
      cerrarPanel()
      notifySuccess(`Sesión iniciada en ${cuadraSeleccionada?.nombre || zonaSeleccionada.nombre}`)
    } catch (err) {
      notifyError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleStopSession = async () => {
    if (!sesionActiva) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sesionActiva.id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al finalizar sesión')
      const data = await res.json()
      setSesionActiva(null)
      await showDialog({
        type: 'success',
        title: 'Sesión finalizada',
        message: 'Tu estacionamiento quedó registrado.',
        lines: [
          { label: 'Comprobante', value: data.comprobante },
          { label: 'Duración', value: `${data.minutos} min` },
          { label: 'Monto', value: `$${data.monto}` },
        ],
        buttonLabel: 'Listo',
      })
    } catch (err) {
      notifyError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBuscarCerca = async () => {
    if (!navigator.geolocation) {
      notifyError('Geolocalización no disponible')
      return
    }
    setBuscandoCerca(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `/api/zonas/${municipioActual}/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radio=200`
        )
        if (!res.ok) throw new Error('Error al buscar')
        const data = await res.json()
        setNearbyPlazas(data.plazas || [])
        if (data.plazas?.length === 0) {
          notifySuccess('No hay plazas libres cerca')
        } else {
          notifySuccess(`${data.plazas.length} plazas libres cerca`)
        }
      } catch (err) {
        notifyError(err.message)
      } finally {
        setBuscandoCerca(false)
      }
    }, () => {
      notifyError('No se pudo obtener tu ubicación')
      setBuscandoCerca(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  const handleMarkerClick = (zona) => {
    if (sesionActiva) return
    setZonaSeleccionada(zona)
    setCuadraSeleccionada(null)
    setShowCuadrasView(false)
    setShowPanel(true)
  }

  const handleCuadraClick = (cuadra) => {
    if (sesionActiva) return
    const zona = datosZonas?.zonas?.find(z => z.nombre === cuadra.zonaNombre)
    if (zona) setZonaSeleccionada(zona)
    setCuadraSeleccionada(cuadra)
    setShowCuadrasView(true)
    setShowPanel(true)
    if (mapInstance && cuadra.lat && cuadra.lng) {
      mapInstance.panTo({ lat: cuadra.lat, lng: cuadra.lng })
      if (mapZoom < ZOOM_CUADRAS) mapInstance.setZoom(ZOOM_CUADRAS)
    }
  }

  const abrirCuadras = () => {
    setShowCuadrasView(true)
    setCuadraSeleccionada(null)
    if (mapInstance && zonaSeleccionada) {
      mapInstance.panTo({ lat: zonaSeleccionada.lat, lng: zonaSeleccionada.lng })
      if (mapZoom < ZOOM_CUADRAS) mapInstance.setZoom(ZOOM_CUADRAS)
    }
  }

  const cerrarPanel = () => {
    setShowPanel(false)
    setShowCuadrasView(false)
    setCuadraSeleccionada(null)
  }

  const abrirConductor = (zona) => {
    setConductorZonaNombre(zona.nombre)
    setZonaSeleccionada(zona)
    setShowPanel(false)
  }

  const cerrarConductor = () => {
    setConductorZonaNombre(null)
  }

  const handleYaLlegue = () => {
    if (zonaConductor) {
      setZonaSeleccionada(zonaConductor)
      setShowPanel(true)
    }
    cerrarConductor()
  }

  useEffect(() => {
    if (sesionActiva) {
      const start = new Date(sesionActiva.inicio).getTime()
      timerRef.current = setInterval(() => {
        const diff = Date.now() - start
        setElapsedMin(Math.floor(diff / 60000))
        setElapsedSec(Math.floor((diff % 60000) / 1000))
      }, 1000)
      return () => clearInterval(timerRef.current)
    } else {
      setElapsedMin(0)
      setElapsedSec(0)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sesionActiva])

  const zonasFiltradas = (datosZonas?.zonas || [])
    .filter(z => filtro === 'todos' || colorClass(z.libres, z.capacidad) === filtro)
    .filter(z => !busqueda || z.nombre.toLowerCase().includes(busqueda.toLowerCase()) || z.ref.toLowerCase().includes(busqueda.toLowerCase()))

  const totalLibres = datosZonas?.zonas?.reduce((s, z) => s + z.libres, 0) || 0

  const elapsed = sesionActiva ? elapsedMin : 0
  const costoEstimado = sesionActiva ? Math.round(Math.max(0, elapsedMin - 15) * (sesionActiva.tarifaHora || 750) / 60) : 0

  const zonaClase = zonaSeleccionada
    ? colorClass(zonaSeleccionada.libres, zonaSeleccionada.capacidad)
    : 'verde'

  const zonaConductor = datosZonas?.zonas?.find(z => z.nombre === conductorZonaNombre)
  const conductorClase = zonaConductor
    ? colorClass(zonaConductor.libres, zonaConductor.capacidad)
    : 'verde'

  const cuadrasZona = useMemo(() => {
    if (!zonaSeleccionada) return []
    let list = cuadras.filter(c => c.zonaNombre === zonaSeleccionada.nombre && c.medido)
    if (userPosition) {
      list = [...list].sort((a, b) =>
        distanciaMetros(userPosition, a) - distanciaMetros(userPosition, b)
      )
    }
    return list
  }, [cuadras, zonaSeleccionada, userPosition])

  const cuadrasVisibles = useMemo(() => {
    if (mapZoom < ZOOM_CUADRAS) return []
    let list = cuadras.filter(c => c.medido && c.lat && c.lng)
    if (zonaSeleccionada) {
      list = list.filter(c => c.zonaNombre === zonaSeleccionada.nombre)
    } else if (userPosition) {
      list = list.filter(c => distanciaMetros(userPosition, c) < 900)
    }
    return list
  }, [cuadras, mapZoom, zonaSeleccionada, userPosition])

  const cuadraClase = cuadraSeleccionada
    ? colorCuadra(cuadraSeleccionada.libres, cuadraSeleccionada.capacidad)
    : 'verde'

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="mapa-cargando">
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
          <p style={{ color: '#D6402B', fontWeight: 600, marginBottom: 12 }}>
            Falta la API key de Google Maps
          </p>
          <p style={{ color: '#6B7686', fontSize: 14 }}>
            Agregá <code>VITE_GOOGLE_MAPS_API_KEY</code> en <code>frontend/.env</code> con una key de Google Maps JavaScript API habilitada.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mapa-cargando">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: '#6B7686' }}>Cargando zonas...</p>
        </div>
      </div>
    )
  }

  if (error && municipios.length === 0) {
    return (
      <div className="mapa-cargando">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#D6402B', fontWeight: 600, marginBottom: 16 }}>{error}</p>
          <button type="button" onClick={fetchMunicipios} className="btn-park" style={{ maxWidth: 200 }}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
    <div className="mapa-pagina">
      <div className="cabecera">
        <div className="fila-superior">
          <div className="chip-marca">
            <div className="senal-e" aria-hidden="true">E</div>
            <strong>Hay Lugar</strong>
          </div>
          {user?.role === 'admin' && (
            <button
              type="button"
              className="btn-admin-link"
              onClick={() => navigate('/admin')}
              title="Panel de administración"
            >
              <Settings size={16} /> Admin
            </button>
          )}
          <div className="selector">
            <select
              value={municipioActual || ''}
              onChange={(e) => {
                setMunicipioActual(e.target.value)
                setShowPanel(false)
                setZonaSeleccionada(null)
              }}
              aria-label="Elegir municipio"
            >
              {municipios.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="fila-busqueda">
          <input
            type="text"
            placeholder="Buscar zona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-busqueda"
            aria-label="Buscar zona"
          />
        </div>
        <div className="fila-chips">
          <div className="chip-total">
            <span className={`status-dot ${sseConnected ? 'connected' : 'disconnected'}`} />
            <span className="num">{totalLibres}</span>
            lugares libres
          </div>
          {['todos', 'verde', 'ambar', 'rojo'].map(f => (
            <button
              key={f}
              type="button"
              className={`chip-filtro ${filtro === f ? 'activo' : ''} ${f !== 'todos' ? f : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todos' ? 'Todos' : f === 'verde' ? 'Libre' : f === 'ambar' ? 'Poco' : 'Lleno'}
            </button>
          ))}
        </div>
      </div>

      {sesionActiva && (
        <div className="banner-sesion">
          <div className="caja">
            <div className="sesion-info">
              <span className="sesion-zona">{sesionActiva.zonaNombre}</span>
              <span className="sesion-patente">{sesionActiva.patente}</span>
            </div>
            <div className="sesion-timer">
              <span className="timer-digits">{String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}</span>
              <span className="timer-label">min</span>
            </div>
            <div className="sesion-costo">
              {elapsedMin <= 15 ? (
                <span className="costo-gratis">15 min gratis</span>
              ) : (
                <span className="costo-monto">${costoEstimado} estimado</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mapa-container">
        {municipioCoords && (
          <Map
            mapId="hay-lugar-map"
            defaultCenter={municipioCoords}
            defaultZoom={14}
            gestureHandling="greedy"
            disableDefaultUI
            mapTypeId={mapType}
            reuseMaps
          >
            <MapController onMapReady={setMapInstance} onZoomChange={setMapZoom} />

            {cuadrasVisibles.map(c => (
              <CuadraPolyline
                key={`cp-${c.id}`}
                cuadra={c}
                selected={cuadraSeleccionada?.id === c.id}
              />
            ))}

            {mapZoom < ZOOM_CUADRAS && zonasFiltradas.map((zona) => (
              <ZoneCircle key={`circ-${zona.nombre}`} zona={zona} />
            ))}

            {mapZoom < ZOOM_CUADRAS && zonasFiltradas.map((zona) => (
              <ZoneMarker key={`mk-${zona.nombre}`} zona={zona} onClick={handleMarkerClick} />
            ))}

            {cuadrasVisibles.map(c => (
              <CuadraMarker
                key={`cm-${c.id}`}
                cuadra={c}
                onClick={handleCuadraClick}
                selected={cuadraSeleccionada?.id === c.id}
              />
            ))}

            {nearbyPlazas?.map((p) => (
              <NearbyDot key={`nearby-${p.id}`} plaza={p} />
            ))}

            <UserMarker position={userPosition} />
          </Map>
        )}
      </div>

      <button
        type="button"
        className={`btn-ubicacion${showPanel ? ' con-panel' : ''}`}
        onClick={handleRecenter}
        title="Mi ubicación"
        aria-label="Mi ubicación"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          <line x1="12" y1="1.5" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22.5" y2="12" />
        </svg>
      </button>

      <div className={`controles-zoom${showPanel ? ' con-panel' : ''}`}>
        <button
          type="button"
          className="zoom-btn"
          onClick={handleZoomIn}
          title="Acercar"
          aria-label="Acercar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className="zoom-btn"
          onClick={handleZoomOut}
          title="Alejar"
          aria-label="Alejar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className="zoom-btn capa-btn"
          onClick={toggleMapType}
          title={mapType === 'roadmap' ? 'Ver satélite' : 'Ver mapa'}
          aria-label={mapType === 'roadmap' ? 'Ver satélite' : 'Ver mapa'}
        >
          {mapType === 'roadmap' ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2 L20 7 L12 12 L4 7 Z" />
              <path d="M4 12 L12 17 L20 12" />
              <path d="M4 17 L12 22 L20 17" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6 L9 4 L15 6 L21 4 L21 18 L15 20 L9 18 L3 20 Z" />
              <line x1="9" y1="4" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="20" />
            </svg>
          )}
        </button>
      </div>

      <button
        type="button"
        className={`btn-voz${showPanel ? ' con-panel' : ''}`}
        title="Preguntar por voz"
        aria-label="Preguntar por voz"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
          <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11z" />
        </svg>
      </button>

      <button
        type="button"
        className={`btn-cerca${showPanel ? ' con-panel' : ''}${buscandoCerca ? ' cargando' : ''}`}
        onClick={handleBuscarCerca}
        disabled={buscandoCerca}
        title="Buscar lugares libres cerca"
        aria-label="Buscar lugares libres cerca"
      >
        <ParkingCircle size={22} />
      </button>

      {showPanel && zonaSeleccionada && showCuadrasView && cuadraSeleccionada && (
        <div className="hoja-zona">
          <div className={`tarjeta ${cuadraClase}`}>
            <div className="fila-titulo">
              <div>
                <button type="button" className="btn-volver" onClick={() => setCuadraSeleccionada(null)}>
                  ← Cuadras
                </button>
                <h3>{cuadraSeleccionada.nombre}</h3>
                <div className="ref">
                  {zonaSeleccionada.nombre} · lado {cuadraSeleccionada.lado || '—'} ·{' '}
                  {cuadraSeleccionada.largoMetros}m medidos ·{' '}
                  <strong style={{ color: '#0B4EA2' }}>${zonaSeleccionada.tarifa}/h</strong>
                </div>
                <div className="ref cuadra-reservas">
                  −{cuadraSeleccionada.reservaMotos} motos · −{cuadraSeleccionada.reservaRemises} remises · −{cuadraSeleccionada.reservaDiscapacitados} discap.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div className="cifra">
                  {cuadraSeleccionada.libres}
                  <small>libres</small>
                </div>
                <button type="button" className="cerrar" onClick={cerrarPanel} aria-label="Cerrar">×</button>
              </div>
            </div>

            <div className="cuadra-titulo">Así está la cuadra ahora</div>
            <ParkingSpotsVisual
              plazas={cuadraSeleccionada.plazas}
              capacidad={cuadraSeleccionada.capacidad}
              libres={cuadraSeleccionada.libres}
            />

            <div className="acciones">
              <button
                type="button"
                className="btn-estacionar"
                onClick={handleStartSession}
                disabled={actionLoading || !!sesionActiva || cuadraSeleccionada.libres === 0}
              >
                {actionLoading ? 'Iniciando...' : sesionActiva ? 'Ya tenés sesión activa' : `Estacionar en ${cuadraSeleccionada.nombre}`}
              </button>
              <button type="button" className="btn-reportar" title="Reportar"><AlertTriangle size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {showPanel && zonaSeleccionada && showCuadrasView && !cuadraSeleccionada && (
        <div className="hoja-zona">
          <div className={`tarjeta ${zonaClase}`}>
            <div className="fila-titulo">
              <div>
                <button type="button" className="btn-volver" onClick={() => setShowCuadrasView(false)}>
                  ← Zona
                </button>
                <h3>Lugares en {zonaSeleccionada.nombre}</h3>
                <div className="ref">
                  {cuadrasZona.length} cuadras medidas · {cuadrasZona.reduce((s, c) => s + c.libres, 0)} libres
                  {userPosition && ' · ordenadas por cercanía'}
                </div>
              </div>
              <button type="button" className="cerrar" onClick={cerrarPanel} aria-label="Cerrar">×</button>
            </div>

            <div className="lista-cuadras">
              {cuadrasZona.map(c => {
                const cl = colorCuadra(c.libres, c.capacidad)
                const dist = userPosition ? distanciaMetros(userPosition, c) : null
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`cuadra-item ${cl}`}
                    onClick={() => handleCuadraClick(c)}
                  >
                    <div className="cuadra-item-top">
                      <span className="cuadra-item-nom">{c.nombre}</span>
                      <span className={`cuadra-item-num ${cl}`}>{c.libres} libres</span>
                    </div>
                    <div className="cuadra-item-sub">
                      {c.libres} de {c.capacidad} lugares
                      {dist != null && ` · a ${textoDistancia(dist)}`}
                    </div>
                    <ParkingSpotsVisual plazas={c.plazas} capacidad={c.capacidad} libres={c.libres} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showPanel && zonaSeleccionada && !showCuadrasView && (
        <div className="hoja-zona">
          <div className={`tarjeta ${zonaClase}`}>
            <div className="fila-titulo">
              <div>
                <h3>{zonaSeleccionada.nombre}</h3>
                <div className="ref">
                  {zonaSeleccionada.ref} · {zonaSeleccionada.capacidad} lugares ·{' '}
                  <strong style={{ color: '#0B4EA2' }}>${zonaSeleccionada.tarifa}/h ahora</strong>{' '}
                  <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Zap size={11} /> tarifa inteligente</span>
                </div>
                {mapZoom < ZOOM_CUADRAS && (
                  <div className="ref zoom-hint">Acercá el mapa para ver cuadras</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div className="cifra">
                  {zonaSeleccionada.libres}
                  <small>libres</small>
                </div>
                <button type="button" className="cerrar" onClick={cerrarPanel} aria-label="Cerrar">×</button>
              </div>
            </div>

            <div className="cuadra-titulo">Resumen de la zona</div>
            <ParkingSpotsVisual capacidad={zonaSeleccionada.capacidad} libres={zonaSeleccionada.libres} />

            <div className="acciones">
              <button
                type="button"
                className="btn-estacionar"
                onClick={handleStartSession}
                disabled={actionLoading || !!sesionActiva}
              >
                {actionLoading ? 'Iniciando...' : sesionActiva ? 'Ya tenés sesión activa' : 'Estacionar acá'}
              </button>
              <button type="button" className="btn-reportar" title="Reportar"><AlertTriangle size={20} /></button>
            </div>
            <div className="acciones">
              <button type="button" className="btn-cuadras" onClick={abrirCuadras}>
                <ParkingCircle size={16} /> Lugares
              </button>
              <button type="button" className="btn-conductor" onClick={() => abrirConductor(zonaSeleccionada)}>
                <Car size={16} /> Conductor
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="barra-park">
        <button
          type="button"
          className={`btn-park${sesionActiva ? ' activo' : ''}`}
          disabled={actionLoading}
          onClick={() => {
            if (sesionActiva) {
              handleStopSession()
            } else if (zonaSeleccionada) {
              handleStartSession()
            }
          }}
        >
          {actionLoading
            ? 'Procesando...'
            : sesionActiva
              ? `Finalizar (${elapsed} min)`
              : 'Estacioné acá'}
        </button>
      </div>

      {conductorZonaNombre && zonaConductor && (
        <div className="modo-conductor">
          <div className="cond-zona">{zonaConductor.nombre}</div>
          <div className={`cond-numero ${conductorClase}`}>{zonaConductor.libres}</div>
          <div className="cond-sub">lugares libres</div>
          <div className="cond-tarifa">
            <Zap size={14} /> ${zonaConductor.tarifa}/h ahora · 15 min gratis
          </div>
          <button type="button" className="cond-llegue" onClick={handleYaLlegue}>
            Ya llegué
          </button>
          <button type="button" className="cond-salir" onClick={cerrarConductor}>
            Salir del modo conductor
          </button>
        </div>
      )}
    </div>
    </APIProvider>
  )
}
