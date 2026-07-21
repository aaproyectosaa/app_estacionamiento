import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useParkingStore } from '../stores/parkingStore'
import { notifyError, notifySuccess } from '../lib/notify'
import {
  Square, MapPin, Ruler, Check, X, Save, ParkingCircle, LayoutGrid, Route,
  HelpCircle, Navigation, Info,
} from 'lucide-react'
import '../styles/measure.css'

const TIPOS = {
  plaza: {
    label: 'Plazas',
    icon: ParkingCircle,
    desc: 'Marcá cada lugar de estacionamiento con GPS, uno por uno.',
    tooltip: 'Parate en el centro de cada plaza y capturá su ubicación. Sirve para el mapa detallado y la ocupación en tiempo real.',
  },
  cuadra: {
    label: 'Cuadras',
    icon: LayoutGrid,
    desc: 'Recorré la cuadra y marcá puntos cada ~10 m.',
    tooltip: 'Con los puntos se traza el segmento de calle. Después se calcula cuántos autos entran según el largo medido.',
  },
  calle: {
    label: 'Calles',
    icon: Route,
    desc: 'Recorré la calle completa marcando puntos cada ~20 m.',
    tooltip: 'Define la geometría de la calle en el mapa. Útil como referencia para agrupar cuadras.',
  },
}

function HelpTip({ children, title }) {
  return (
    <div className="measure-help" title={title}>
      <HelpCircle size={15} aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function StepCard({ step, title, hint, done, active, children }) {
  return (
    <section className={`measure-step ${active ? 'activo' : ''} ${done ? 'hecho' : ''}`}>
      <div className="measure-step-head">
        <span className="measure-step-num" aria-hidden="true">{done ? <Check size={14} /> : step}</span>
        <div>
          <h3>{title}</h3>
          {hint && <p className="measure-step-hint">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function GpsPanel({ gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS, children }) {
  const gpsOk = !!gpsCoords
  const precisionBuena = gpsAccuracy != null && gpsAccuracy <= 15

  return (
    <div className="measure-gps">
      <div className="measure-gps-top">
        <div className="gps-status">
          <span className={`gps-dot ${gpsOk ? 'ok' : 'off'}`} />
          <div>
            {gpsOk ? (
              <>
                <span className="gps-label">Señal GPS activa</span>
                <span className="gps-coords">
                  {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                </span>
                {gpsAccuracy != null && (
                  <span className={`gps-accuracy ${precisionBuena ? 'buena' : 'regular'}`}>
                    Precisión ±{Math.round(gpsAccuracy)} m
                    {!precisionBuena && ' — movelte un poco al aire libre'}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="gps-label">GPS apagado</span>
                <span className="gps-waiting">Activá el GPS para medir en el lugar</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className={`gps-btn ${watchId ? 'activo' : ''}`}
          onClick={watchId ? stopGPS : startGPS}
          title={watchId ? 'Detiene el seguimiento GPS' : 'Necesario para registrar coordenadas reales'}
        >
          {watchId ? <><Square size={14} /> Detener GPS</> : <><Navigation size={14} /> Activar GPS</>}
        </button>
      </div>
      <HelpTip title="Consejo de precisión">
        Usá el teléfono al aire libre, lejos de edificios altos. Esperá a que la precisión baje de 15 m antes de capturar.
      </HelpTip>
      {children}
    </div>
  )
}

function MedirPlazas({
  api, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
  zonas, zonaSeleccionada, setZonaSeleccionada,
}) {
  const [plazas, setPlazas] = useState([])
  const [plazaActual, setPlazaActual] = useState(null)
  const [midiendo, setMidiendo] = useState(false)
  const [angulo, setAngulo] = useState(90)

  useEffect(() => {
    if (zonaSeleccionada) {
      setPlazas(zonaSeleccionada.plazas || [])
      const primera = (zonaSeleccionada.plazas || []).find(p => !p.medido)
      setPlazaActual(primera || null)
    }
  }, [zonaSeleccionada])

  const medirPlaza = async (plaza) => {
    if (!gpsCoords) {
      notifyError('Activá el GPS y esperá la señal antes de capturar')
      return
    }
    setMidiendo(true)
    try {
      await api(`/api/plazas/${plaza.id}/measure`, {
        method: 'POST',
        body: JSON.stringify({ lat: gpsCoords.lat, lng: gpsCoords.lng, angulo }),
      })
      setPlazas(prev => {
        const next = prev.map(p =>
          p.id === plaza.id
            ? { ...p, medido: true, lat: gpsCoords.lat, lng: gpsCoords.lng, angulo }
            : p
        )
        const idx = next.findIndex(p => p.id === plaza.id)
        for (let i = idx + 1; i < next.length; i++) {
          if (!next[i].medido) { setPlazaActual(next[i]); return next }
        }
        for (let i = 0; i < idx; i++) {
          if (!next[i].medido) { setPlazaActual(next[i]); return next }
        }
        setPlazaActual(null)
        return next
      })
      notifySuccess('Plaza guardada — pasando a la siguiente')
    } catch (err) {
      notifyError(err.message)
    } finally {
      setMidiendo(false)
    }
  }

  const pendientes = plazas.filter(p => !p.medido)
  const medidas = plazas.filter(p => p.medido)

  return (
    <>
      <StepCard
        step={1}
        title="Elegí la zona"
        hint="Cada zona agrupa las plazas de un barrio o sector medido."
        done={!!zonaSeleccionada}
        active={!zonaSeleccionada}
      >
        <div className="measure-zone-selector">
          {zonas.map(z => {
            const zPct = z.totalPlazas > 0 ? Math.round((z.medidas / z.totalPlazas) * 100) : 0
            return (
              <button
                key={z.id}
                type="button"
                className={`measure-zone-btn ${zonaSeleccionada?.id === z.id ? 'activo' : ''}`}
                onClick={() => setZonaSeleccionada(z)}
                title={`${z.medidas} de ${z.totalPlazas} plazas medidas en ${z.nombre}`}
              >
                <span className="zone-name">{z.nombre}</span>
                <span className="zone-progress">{z.medidas}/{z.totalPlazas} · {zPct}%</span>
              </button>
            )
          })}
        </div>
      </StepCard>

      {zonaSeleccionada && (
        <>
          <StepCard
            step={2}
            title="Activá el GPS"
            hint="Parate sobre la plaza que vas a medir."
            done={!!gpsCoords}
            active={!gpsCoords}
          >
            <GpsPanel {...{ gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS }}>
              <div className="gps-angle">
                <label htmlFor="angulo-plaza">
                  Orientación del vehículo
                  <span className="field-tip" title="0° = norte, 90° = este. Mirá hacia dónde apuntan las ruedas del auto estacionado.">
                    (grados)
                  </span>
                </label>
                <input
                  id="angulo-plaza"
                  type="number"
                  value={angulo}
                  onChange={(e) => setAngulo(Number(e.target.value))}
                  min="0"
                  max="360"
                  step="5"
                  title="Dirección en la que queda estacionado el vehículo"
                />
              </div>
              <HelpTip title="Ángulo">
                Si el auto queda paralelo a la vereda en sentido este-oeste, usá 90°. Podés ajustarlo en pasos de 5°.
              </HelpTip>
            </GpsPanel>
          </StepCard>

          <StepCard
            step={3}
            title="Elegí la plaza a medir"
            hint={`${pendientes.length} pendientes · ${medidas.length} ya medidas en ${zonaSeleccionada.nombre}`}
            done={!!plazaActual}
            active={!!gpsCoords && !plazaActual}
          >
            {pendientes.length === 0 ? (
              <p className="measure-empty success"><Check size={16} /> Todas las plazas de esta zona están medidas</p>
            ) : (
              <div className="plaza-grid">
                {pendientes.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`plaza-btn ${plazaActual?.id === p.id ? 'activo' : ''}`}
                    onClick={() => setPlazaActual(p)}
                    title="Tocá para seleccionar esta plaza antes de capturar"
                  >
                    <span className="plaza-btn-title">Plaza {i + 1}</span>
                    <span className="plaza-btn-sub">Cuadra {p.cuadra + 1}</span>
                  </button>
                ))}
              </div>
            )}
            {medidas.length > 0 && (
              <details className="measure-details">
                <summary>Ver {medidas.length} plazas ya medidas</summary>
                <div className="plaza-grid compact">
                  {medidas.map((p, i) => (
                    <div key={p.id} className="plaza-btn medido" title="Esta plaza ya tiene GPS">
                      Plaza {i + 1} <Check size={12} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </StepCard>

          {plazaActual && (
            <StepCard
              step={4}
              title="Capturá la ubicación"
              hint={`Parate en el centro de la plaza seleccionada y tocá el botón verde.`}
              active
            >
              <div className="measure-current">
                <div className="measure-current-info">
                  <strong>Plaza en cuadra {plazaActual.cuadra + 1}</strong>
                  <span>ID {plazaActual.id.slice(-6)}</span>
                </div>
                <button
                  type="button"
                  className="measure-btn"
                  disabled={!gpsCoords || midiendo}
                  onClick={() => medirPlaza(plazaActual)}
                  title={!gpsCoords ? 'Primero activá el GPS' : 'Guarda lat, lng y ángulo de esta plaza'}
                >
                  {midiendo ? 'Guardando...' : <><Ruler size={16} /> Capturar plaza acá</>}
                </button>
                {!gpsCoords && (
                  <p className="measure-warn"><Info size={14} /> Activá el GPS en el paso 2 para habilitar la captura.</p>
                )}
              </div>
            </StepCard>
          )}
        </>
      )}
    </>
  )
}

function MedirCuadras({
  api, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
  zonas, zonaSeleccionada, setZonaSeleccionada,
}) {
  const [cuadras, setCuadras] = useState([])
  const [cuadraActual, setCuadraActual] = useState(null)
  const [midiendo, setMidiendo] = useState(false)
  const [puntos, setPuntos] = useState([])

  useEffect(() => {
    if (!zonaSeleccionada) return
    api(`/api/cuadras/${zonaSeleccionada.id}`).then(data => {
      setCuadras(data.cuadras || [])
      const primera = (data.cuadras || []).find(c => !c.medido)
      setCuadraActual(primera || null)
    }).catch(notifyError)
  }, [zonaSeleccionada, api])

  const marcarPunto = () => {
    if (!gpsCoords) {
      notifyError('Activá el GPS antes de marcar puntos')
      return
    }
    setPuntos(prev => [...prev, [gpsCoords.lat, gpsCoords.lng]])
    notifySuccess(`Punto ${puntos.length + 1} agregado — seguí caminando`)
  }

  const guardarCuadra = async () => {
    if (puntos.length < 2) {
      notifyError('Marcá al menos 2 puntos: inicio y fin del lado estacionable')
      return
    }
    if (!cuadraActual) return
    setMidiendo(true)
    try {
      await api(`/api/cuadras/${cuadraActual.id}/measure`, {
        method: 'PUT',
        body: JSON.stringify({ coordenadas: puntos }),
      })
      notifySuccess(`${cuadraActual.nombre} guardada`)
      setPuntos([])
      setCuadras(prev => {
        const next = prev.map(c => c.id === cuadraActual.id ? { ...c, medido: true } : c)
        const siguiente = next.find(c => !c.medido)
        setCuadraActual(siguiente || null)
        return next
      })
    } catch (err) {
      notifyError(err.message)
    } finally {
      setMidiendo(false)
    }
  }

  const pendientes = cuadras.filter(c => !c.medido)

  return (
    <>
      <StepCard step={1} title="Elegí la zona" done={!!zonaSeleccionada} active={!zonaSeleccionada}>
        <div className="measure-zone-selector">
          {zonas.map(z => (
            <button
              key={z.id}
              type="button"
              className={`measure-zone-btn ${zonaSeleccionada?.id === z.id ? 'activo' : ''}`}
              onClick={() => { setZonaSeleccionada(z); setCuadraActual(null); setPuntos([]) }}
            >
              <span className="zone-name">{z.nombre}</span>
              <span className="zone-progress">{z.ref}</span>
            </button>
          ))}
        </div>
      </StepCard>

      {zonaSeleccionada && (
        <>
          <StepCard step={2} title="Activá el GPS y caminá la cuadra" done={!!gpsCoords} active={!gpsCoords}>
            <GpsPanel {...{ gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS }} />
            <HelpTip title="Cómo medir una cuadra">
              Caminá por el cordón donde se estaciona. Marcá un punto al inicio, otro cada ~10 m y uno al final. Mínimo 2 puntos.
            </HelpTip>
          </StepCard>

          <StepCard
            step={3}
            title="Elegí la cuadra"
            hint={`${pendientes.length} pendientes en ${zonaSeleccionada.nombre}`}
            done={!!cuadraActual}
          >
            <div className="plaza-grid">
              {pendientes.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`plaza-btn ${cuadraActual?.id === c.id ? 'activo' : ''}`}
                  onClick={() => { setCuadraActual(c); setPuntos([]) }}
                  title="Seleccioná el tramo de calle a medir"
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </StepCard>

          {cuadraActual && (
            <StepCard step={4} title={`Medir: ${cuadraActual.nombre}`} active>
              <div className="measure-puntos-bar">
                <span className={`puntos-count ${puntos.length >= 2 ? 'ok' : ''}`}>
                  {puntos.length} punto{puntos.length !== 1 ? 's' : ''} marcado{puntos.length !== 1 ? 's' : ''}
                </span>
                {puntos.length < 2 && (
                  <span className="puntos-falta">Faltan {2 - puntos.length} para guardar</span>
                )}
              </div>
              <div className="measure-botones-linea">
                <button
                  type="button"
                  className="measure-btn-linea"
                  disabled={!gpsCoords}
                  onClick={marcarPunto}
                  title="Registra tu ubicación actual como un punto del trazado"
                >
                  <MapPin size={14} /> Marcar punto acá
                </button>
                {puntos.length > 0 && (
                  <button
                    type="button"
                    className="measure-btn-linea secundario"
                    onClick={() => setPuntos([])}
                    title="Borrar todos los puntos y empezar de nuevo"
                  >
                    <X size={14} /> Limpiar
                  </button>
                )}
              </div>
              <button
                type="button"
                className="measure-btn"
                disabled={puntos.length < 2 || midiendo}
                onClick={guardarCuadra}
                title="Guarda la línea formada por los puntos marcados"
              >
                {midiendo ? 'Guardando...' : <><Save size={16} /> Guardar cuadra ({puntos.length} pts)</>}
              </button>
            </StepCard>
          )}
        </>
      )}
    </>
  )
}

function MedirCalles({
  api, municipioActual, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
}) {
  const [calles, setCalles] = useState([])
  const [calleActual, setCalleActual] = useState(null)
  const [midiendo, setMidiendo] = useState(false)
  const [puntos, setPuntos] = useState([])

  useEffect(() => {
    if (!municipioActual) return
    api(`/api/calles/${municipioActual}`).then(data => {
      setCalles(data.calles || [])
    }).catch(notifyError)
  }, [municipioActual, api])

  const marcarPunto = () => {
    if (!gpsCoords) {
      notifyError('Activá el GPS antes de marcar puntos')
      return
    }
    setPuntos(prev => [...prev, [gpsCoords.lat, gpsCoords.lng]])
    notifySuccess(`Punto ${puntos.length + 1} agregado`)
  }

  const guardarCalle = async () => {
    if (puntos.length < 2 || !calleActual) return
    setMidiendo(true)
    try {
      await api(`/api/calles/${calleActual.id}/measure`, {
        method: 'PUT',
        body: JSON.stringify({ coordenadas: puntos }),
      })
      notifySuccess(`Calle ${calleActual.nombre} guardada`)
      setPuntos([])
      setCalles(prev => prev.map(c => c.id === calleActual.id ? { ...c, medido: true } : c))
      setCalleActual(null)
    } catch (err) {
      notifyError(err.message)
    } finally {
      setMidiendo(false)
    }
  }

  const pendientes = calles.filter(c => !c.medido)

  return (
    <>
      <StepCard step={1} title="Activá el GPS" done={!!gpsCoords} active={!gpsCoords}>
        <GpsPanel {...{ gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS }} />
        <HelpTip title="Medición de calle">
          Recorré la calle completa por el centro del carril o vereda y marcá puntos cada ~20 m.
        </HelpTip>
      </StepCard>

      <StepCard step={2} title="Elegí la calle" hint={`${pendientes.length} pendientes`} done={!!calleActual}>
        <div className="plaza-grid">
          {pendientes.map(c => (
            <button
              key={c.id}
              type="button"
              className={`plaza-btn ${calleActual?.id === c.id ? 'activo' : ''}`}
              onClick={() => { setCalleActual(c); setPuntos([]) }}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </StepCard>

      {calleActual && (
        <StepCard step={3} title={`Medir: ${calleActual.nombre}`} active>
          <div className="measure-puntos-bar">
            <span className={`puntos-count ${puntos.length >= 2 ? 'ok' : ''}`}>
              {puntos.length} puntos
            </span>
          </div>
          <div className="measure-botones-linea">
            <button type="button" className="measure-btn-linea" disabled={!gpsCoords} onClick={marcarPunto}>
              <MapPin size={14} /> Marcar punto
            </button>
            {puntos.length > 0 && (
              <button type="button" className="measure-btn-linea secundario" onClick={() => setPuntos([])}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
          <button
            type="button"
            className="measure-btn"
            disabled={puntos.length < 2 || midiendo}
            onClick={guardarCalle}
          >
            {midiendo ? 'Guardando...' : <><Save size={16} /> Guardar calle</>}
          </button>
        </StepCard>
      )}
    </>
  )
}

export default function MeasurePage() {
  const navigate = useNavigate()
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const { municipios, municipioActual, setMunicipios, setMunicipioActual } = useParkingStore()

  const [zonas, setZonas] = useState([])
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [tipoMedicion, setTipoMedicion] = useState('plaza')
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [watchId, setWatchId] = useState(null)
  const [tab, setTab] = useState('medir')
  const [exportFormat, setExportFormat] = useState('json')

  const api = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...opts,
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error')
    return res.json()
  }, [token])

  const fetchZonas = useCallback(async (id) => {
    if (!id) return
    setCargando(true)
    try {
      const data = await api(`/api/zonas/${id}/measure`)
      setZonas(data.zonas || [])
      setZonaSeleccionada(prev => {
        if (!data.zonas?.length) return null
        if (prev) return data.zonas.find(z => z.id === prev.id) || data.zonas[0]
        return data.zonas[0]
      })
    } catch (err) {
      notifyError(err.message)
    } finally {
      setCargando(false)
    }
  }, [api])

  useEffect(() => {
    api('/api/municipios').then(data => {
      setMunicipios(data)
      if (data.length > 0 && !municipioActual) setMunicipioActual(data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (municipioActual) fetchZonas(municipioActual)
  }, [municipioActual, fetchZonas])

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      notifyError('Geolocalización no disponible en este dispositivo')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsAccuracy(pos.coords.accuracy ?? null)
      },
      (err) => notifyError('Error GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
    setWatchId(id)
  }, [])

  const stopGPS = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setGpsCoords(null)
      setGpsAccuracy(null)
    }
  }, [watchId])

  useEffect(() => () => { if (watchId) navigator.geolocation.clearWatch(watchId) }, [watchId])

  useEffect(() => {
    if (tab === 'medir' && !watchId) startGPS()
  }, [tab, tipoMedicion])

  const exportarDatos = async () => {
    try {
      const url = `/api/zonas/${municipioActual}/export?format=${exportFormat}`
      if (exportFormat === 'csv') {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `plazas-${municipioActual}.csv`
        a.click()
      } else {
        const data = await api(url)
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `plazas-${municipioActual}.json`
        a.click()
      }
      notifySuccess('Archivo descargado')
    } catch (err) {
      notifyError(err.message)
    }
  }

  const zonaMedidas = zonas.reduce((s, z) => s + z.medidas, 0)
  const zonaTotal = zonas.reduce((s, z) => s + z.totalPlazas, 0)
  const pctGlobal = zonaTotal > 0 ? Math.round((zonaMedidas / zonaTotal) * 100) : 0

  if (user?.role !== 'admin') {
    return (
      <div className="measure-denied">
        <h2>Acceso denegado</h2>
        <p>Solo administradores pueden medir plazas.</p>
        <button type="button" onClick={() => navigate('/map')}>Volver al mapa</button>
      </div>
    )
  }

  const tipoInfo = TIPOS[tipoMedicion]
  const TipoIcon = tipoInfo.icon

  return (
    <div className="measure-page">
      <header className="measure-header">
        <button type="button" className="measure-back" onClick={() => navigate('/admin')}>← Admin</button>
        <h1>Medición en campo</h1>
        <div className="measure-header-select">
          <select
            value={municipioActual || ''}
            onChange={(e) => setMunicipioActual(e.target.value)}
            title="Municipio donde estás cargando datos"
          >
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </header>

      {tipoMedicion === 'plaza' && (
        <div className="measure-summary">
          <div className="measure-stat">
            <span className="measure-stat-num">{zonaMedidas}</span>
            <span className="measure-stat-label">Medidas</span>
          </div>
          <div className="measure-stat">
            <span className="measure-stat-num">{zonaTotal - zonaMedidas}</span>
            <span className="measure-stat-label">Pendientes</span>
          </div>
          <div className={`measure-stat ${pctGlobal >= 80 ? 'verde' : pctGlobal >= 40 ? 'ambar' : ''}`}>
            <span className="measure-stat-num">{pctGlobal}%</span>
            <span className="measure-stat-label">Progreso</span>
          </div>
          <div className="measure-stat">
            <span className="measure-stat-num">{zonas.length}</span>
            <span className="measure-stat-label">Zonas</span>
          </div>
        </div>
      )}

      <div className="measure-intro">
        <TipoIcon size={20} />
        <div>
          <strong>{tipoInfo.label}</strong>
          <p>{tipoInfo.desc}</p>
        </div>
      </div>

      <div className="measure-tipo-selector">
        {Object.entries(TIPOS).map(([key, t]) => {
          const Icon = t.icon
          return (
            <button
              key={key}
              type="button"
              className={`measure-tipo-btn ${tipoMedicion === key ? 'activo' : ''}`}
              onClick={() => setTipoMedicion(key)}
              title={t.tooltip}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      <HelpTip title={tipoInfo.tooltip}>{tipoInfo.tooltip}</HelpTip>

      <div className="measure-tabs">
        <button type="button" className={`measure-tab ${tab === 'medir' ? 'activo' : ''}`} onClick={() => setTab('medir')}>
          Medir
        </button>
        {tipoMedicion === 'plaza' && (
          <>
            <button type="button" className={`measure-tab ${tab === 'progreso' ? 'activo' : ''}`} onClick={() => setTab('progreso')}>
              Progreso
            </button>
            <button type="button" className={`measure-tab ${tab === 'exportar' ? 'activo' : ''}`} onClick={() => setTab('exportar')}>
              Exportar
            </button>
          </>
        )}
      </div>

      <div className="measure-content">
        {tab === 'medir' && tipoMedicion === 'plaza' && (
          <MedirPlazas {...{
            api, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
            zonas, zonaSeleccionada, setZonaSeleccionada,
          }} />
        )}

        {tab === 'medir' && tipoMedicion === 'cuadra' && (
          <MedirCuadras {...{
            api, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
            zonas, zonaSeleccionada, setZonaSeleccionada,
          }} />
        )}

        {tab === 'medir' && tipoMedicion === 'calle' && (
          <MedirCalles {...{
            api, municipioActual, gpsCoords, gpsAccuracy, watchId, startGPS, stopGPS,
          }} />
        )}

        {tab === 'progreso' && (
          <div className="measure-progress-list">
            <HelpTip title="Progreso por zona">
              Cada barra muestra cuántas plazas ya tienen GPS en esa zona. Aparecen en el mapa cuando están medidas.
            </HelpTip>
            {zonas.map(z => {
              const zPct = z.totalPlazas > 0 ? Math.round((z.medidas / z.totalPlazas) * 100) : 0
              return (
                <div key={z.id} className="measure-progress-item">
                  <div className="progress-header">
                    <span className="progress-name">{z.nombre}</span>
                    <span className="progress-pct">{zPct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${zPct}%` }} />
                  </div>
                  <div className="progress-detail">
                    {z.medidas} medidas · {z.pendientes} pendientes · {z.totalPlazas} total
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'exportar' && (
          <div className="measure-export">
            <h3>Exportar datos medidos</h3>
            <HelpTip title="Exportación">
              Descargá un archivo con las plazas que ya tienen coordenadas GPS. JSON para sistemas; CSV para Excel.
            </HelpTip>
            <div className="export-options">
              <label title="Formato estructurado para desarrollo">
                <input type="radio" value="json" checked={exportFormat === 'json'} onChange={(e) => setExportFormat(e.target.value)} />
                JSON
              </label>
              <label title="Planilla compatible con Excel">
                <input type="radio" value="csv" checked={exportFormat === 'csv'} onChange={(e) => setExportFormat(e.target.value)} />
                CSV
              </label>
            </div>
            <button type="button" className="export-btn" onClick={exportarDatos}>
              Descargar {exportFormat.toUpperCase()}
            </button>
            <p className="export-hint">
              {zonaMedidas} plazas medidas de {zonaTotal} en {zonas.length} zonas.
            </p>
          </div>
        )}
      </div>

      {cargando && (
        <div className="measure-loading">
          <div className="spinner" />
          <p>Cargando datos...</p>
        </div>
      )}
    </div>
  )
}
