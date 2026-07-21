import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { notifyError, notifySuccess } from '../lib/notify'
import {
  ShieldCheck, FilePlus, ClipboardList, ParkingCircle, Ban,
  AlignJustify, Accessibility, Footprints, CornerUpRight, DoorOpen,
  Bus, MapPin, Camera, CheckCircle2, AlertCircle,
} from 'lucide-react'
import '../styles/inspector.css'

const MOTIVOS = [
  { key: 'no_pago', label: 'No pagó el estacionamiento', icon: ParkingCircle },
  { key: 'mal_estacionado', label: 'Mal estacionado', icon: Ban },
  { key: 'doble_fila', label: 'Doble fila', icon: AlignJustify },
  { key: 'sobre_rampa', label: 'Sobre rampa', icon: Accessibility },
  { key: 'senda_peatonal', label: 'Sobre senda peatonal', icon: Footprints },
  { key: 'esquina', label: 'En esquina / ochava', icon: CornerUpRight },
  { key: 'frente_garage', label: 'Frente a garage', icon: DoorOpen },
  { key: 'parada_colectivo', label: 'Parada de colectivo', icon: Bus },
]

export default function InspectorPage() {
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()

  const [tab, setTab] = useState('nueva')
  const [patente, setPatente] = useState('')
  const [motivo, setMotivo] = useState('')
  const [calle, setCalle] = useState('')
  const [foto, setFoto] = useState(null)
  const [monto, setMonto] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [actas, setActas] = useState([])
  const [stats, setStats] = useState({ totalActas: 0, actasHoy: 0, totalMultas: 0 })
  const [cargandoActas, setCargandoActas] = useState(false)
  const [detectando, setDetectando] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const formReady = patente.trim().length >= 6 && motivo

  const fetchActas = useCallback(async () => {
    setCargandoActas(true)
    try {
      const res = await fetch('/api/inspector/actas', { headers })
      if (!res.ok) throw new Error('Error al cargar actas')
      const data = await res.json()
      setActas(data.actas || [])
    } catch (err) {
      notifyError(err.message)
    } finally {
      setCargandoActas(false)
    }
  }, [token])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/inspector/stats', { headers })
      if (res.ok) setStats(await res.json())
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => {
    fetchStats()
    if (tab === 'mis_actas') fetchActas()
  }, [tab, fetchStats, fetchActas])

  const handleDetectar = () => {
    setDetectando(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCalle(`Ubicación: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
          setDetectando(false)
        },
        () => {
          setCalle('No se pudo detectar la ubicación')
          setDetectando(false)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    } else {
      setCalle('Geolocalización no disponible')
      setDetectando(false)
    }
  }

  const handleSubmit = async () => {
    if (!formReady || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/inspector/actas', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          municipioId: 'santafe',
          patente: patente.trim().toUpperCase(),
          motivo,
          calle,
          fotoUrl: foto,
          montoMulta: monto ? Number(monto) : null,
          observaciones: obs,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error al emitir acta')

      setResult(data)
      notifySuccess(data.mensaje)

      setPatente('')
      setMotivo('')
      setCalle('')
      setFoto(null)
      setMonto('')
      setObs('')
      fetchStats()
    } catch (err) {
      notifyError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFotoClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => setFoto(ev.target.result)
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const todayDate = new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

  const navTabs = [
    { key: 'nueva', label: 'Nueva Acta', icon: FilePlus },
    { key: 'mis_actas', label: 'Mis Actas', icon: ClipboardList },
  ]

  return (
    <div className="inspector-page">
      <header className="inspector-header">
        <div className="inspector-header-inner">
          <div className="inspector-header-row">
            <div className="inspector-brand">
              <div className="inspector-brand-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="inspector-brand-text">
                <h1>Hay Lugar Control</h1>
              </div>
            </div>

            <div className="inspector-user-info">
              <div className="name">{user?.name || '—'}</div>
              <div className="meta">
                <span>Leg. {user?.legajo || '—'}</span>
                <span className="sep">·</span>
                <span>{todayDate}</span>
                <span className="sep">·</span>
                <span className="hoy-badge">{stats.actasHoy} hoy</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="inspector-main">
        <div className="inspector-main-inner">
          <nav className="inspector-tabs" aria-label="Secciones del inspector">
            {navTabs.map(t => (
              <button
                key={t.key}
                type="button"
                className={`inspector-tab ${tab === t.key ? 'activo' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span className="inspector-tab-icon"><t.icon size={18} /></span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="inspector-panel">
            {tab === 'nueva' && (
              <>
                <div className="inspector-stats">
                  <div className="inspector-stat">
                    <span className="num">{stats.actasHoy}</span>
                    <span className="label">Hoy</span>
                  </div>
                  <div className="inspector-stat">
                    <span className="num">{stats.totalActas}</span>
                    <span className="label">Total</span>
                  </div>
                  <div className="inspector-stat">
                    <span className="num">${stats.totalMultas.toLocaleString()}</span>
                    <span className="label">Multas</span>
                  </div>
                </div>

                <div className="inspector-form-grid">
                  <div className="inspector-form-col">
                    <div className="inspector-field">
                      <label className="inspector-field-label">
                        Patente <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="patente-input"
                        placeholder="ABC 123"
                        value={patente}
                        onChange={(e) => setPatente(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 8))}
                        maxLength={8}
                        autoComplete="off"
                      />
                    </div>

                    <div className="inspector-field">
                      <label className="inspector-field-label">
                        Motivo de la infracción <span className="req">*</span>
                      </label>
                      <div className="motivos-chips">
                        {MOTIVOS.map(m => (
                          <button
                            key={m.key}
                            type="button"
                            className={`motivo-chip ${motivo === m.key ? 'activo' : ''}`}
                            onClick={() => setMotivo(m.key)}
                          >
                            <span className="chip-icon"><m.icon size={14} /></span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="inspector-field">
                      <label className="inspector-field-label">
                        Calle (según tu ubicación) <span className="req">*</span>
                      </label>
                      <div className="calle-row">
                        <div className="calle-input-wrap">
                          <input
                            type="text"
                            className="calle-input"
                            placeholder='Tocá "Detectar"'
                            value={calle}
                            onChange={(e) => setCalle(e.target.value)}
                          />
                          <div className="calle-subtext">La ubicación queda registrada en el acta</div>
                        </div>
                        <button
                          type="button"
                          className="calle-btn calle-btn-detect"
                          onClick={handleDetectar}
                          disabled={detectando}
                        >
                          <MapPin size={16} /> {detectando ? 'Detectando...' : 'Detectar'}
                        </button>
                      </div>
                    </div>

                    <div className="inspector-field">
                      <label className="inspector-field-label">Monto de la multa</label>
                      <div className="monto-input-wrap">
                        <span className="monto-prefix">$</span>
                        <input
                          type="number"
                          className="monto-input"
                          placeholder="0"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                          min="0"
                        />
                      </div>
                      <div className="monto-hint">Dejalo en blanco si el monto lo define después el juzgado de faltas.</div>
                    </div>
                  </div>

                  <div className="inspector-form-col">
                    <div className="inspector-field foto-field">
                      <label className="inspector-field-label">Foto del vehículo <span className="req">*</span></label>
                      <div className="foto-upload" onClick={handleFotoClick}>
                        {foto ? (
                          <img src={foto} alt="Foto del vehículo" className="foto-preview" />
                        ) : (
                          <div className="foto-upload-placeholder">
                            <div className="foto-upload-icon"><Camera size={40} /></div>
                            <div className="foto-upload-text">Sacar foto del auto y la patente</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="inspector-field obs-field">
                      <label className="inspector-field-label">Observaciones</label>
                      <textarea
                        className="obs-textarea"
                        placeholder="Ej: vehículo sobre rampa de discapacidad, sin ocupante, obstruye salida de cochera..."
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        rows={5}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`inspector-submit ${formReady ? 'ready' : ''}`}
                  disabled={!formReady || loading}
                  onClick={handleSubmit}
                >
                  {loading ? 'Emitiendo...' : 'Emitir Acta'}
                </button>
                <div className="inspector-submit-hint">
                  Los campos con * son obligatorios. El acta queda registrada con fecha, hora, ubicación GPS y foto.
                </div>
              </>
            )}

            {tab === 'mis_actas' && (
              <>
                {cargandoActas ? (
                  <div className="acta-empty"><div className="acta-empty-text">Cargando...</div></div>
                ) : actas.length === 0 ? (
                  <div className="acta-empty">
                    <div className="acta-empty-icon"><ClipboardList size={48} /></div>
                    <div className="acta-empty-text">No tenés actas emitidas</div>
                  </div>
                ) : (
                  <div className="actas-list">
                    {actas.map(a => (
                      <div key={a.id} className="acta-card">
                        <div className="acta-card-header">
                          <span className="acta-card-patente">{a.patente}</span>
                          <span className={`acta-card-estado ${a.estado}`}>{a.estado}</span>
                        </div>
                        <div className="acta-card-motivo">
                          {(() => {
                            const m = MOTIVOS.find(mt => mt.key === a.motivo)
                            return m ? <><m.icon size={14} /> {m.label}</> : a.motivo
                          })()}
                        </div>
                        <div className="acta-card-body">
                          <span className="acta-card-comprobante">{a.comprobante}</span>
                          <span>{a.calle}</span>
                          <span>{new Date(a.createdAt).toLocaleString('es-AR')}</span>
                          {a.observaciones && <span>"{a.observaciones}"</span>}
                        </div>
                        {a.montoMulta > 0 && (
                          <div className="acta-card-monto">${a.montoMulta.toLocaleString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {result && (
        <div className="acta-result" onClick={() => setResult(null)}>
          <div className="acta-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="acta-result-icon">
              {result.estado === 'pagando' ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
            </div>
            <h2 className="acta-result-title">
              {result.estado === 'pagando' ? 'Pago verificado' : 'Acta emitida'}
            </h2>
            {result.comprobante && (
              <div className="acta-result-comprobante">{result.comprobante}</div>
            )}
            <p className="acta-result-msg">{result.mensaje}</p>
            <button className="acta-result-close" onClick={() => setResult(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}