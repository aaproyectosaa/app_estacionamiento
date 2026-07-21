import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useParkingStore } from '../stores/parkingStore'
import { notifyError, notifySuccess } from '../lib/notify'
import { LayoutDashboard, Flag, Clock, MapPin, Building2, Users, Ruler } from 'lucide-react'
import '../styles/admin.css'

const PAGE_SIZE = 50

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="admin-pagination">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>← Anterior</button>
      <span>Página {page} de {pages} ({total} total)</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente →</button>
    </div>
  )
}

export default function AdminPage() {
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const { municipios, municipioActual, setMunicipioActual, setMunicipios } = useParkingStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsMeta, setReportsMeta] = useState({ page: 1, pages: 1, total: 0 })
  const [sessions, setSessions] = useState([])
  const [sessionsMeta, setSessionsMeta] = useState({ page: 1, pages: 1, total: 0 })
  const [zonas, setZonas] = useState([])
  const [municipiosList, setMunicipiosList] = useState([])
  const [users, setUsers] = useState([])
  const [usersMeta, setUsersMeta] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [reportFilter, setReportFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')

  const [reportsPage, setReportsPage] = useState(1)
  const [sessionsPage, setSessionsPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)

  const [showZonaForm, setShowZonaForm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editZona, setEditZona] = useState(null)
  const [zonaForm, setZonaForm] = useState({ nombre: '', ref: '', lat: '', lng: '', capacidad: '' })

  const [showMunicipioForm, setShowMunicipioForm] = useState(false)
  const [editMunicipio, setEditMunicipio] = useState(null)
  const [municipioForm, setMunicipioForm] = useState({ id: '', nombre: '', lat: '', lng: '', tarifaHora: '' })

  const [showReportDetail, setShowReportDetail] = useState(null)
  const [reportEdit, setReportEdit] = useState({ actaNumero: '', notas: '' })

  const api = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...opts,
    })
    if (res.status === 403) { navigate('/'); return null }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error')
    return res.json()
  }, [token, navigate])

  // Cargar municipios al montar (necesario si el admin entra directo sin pasar por el mapa)
  useEffect(() => {
    const loadMunicipios = async () => {
      try {
        const data = await api('/api/municipios')
        if (!data) return
        setMunicipios(data)
        if (data.length > 0 && !municipioActual) {
          setMunicipioActual(data[0].id)
        }
      } catch (e) {
        setError(e.message)
      }
    }
    loadMunicipios()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async () => {
    if (!municipioActual) return
    const data = await api(`/api/admin/stats/${municipioActual}`)
    if (data) setStats(data)
  }, [municipioActual, api])

  const fetchReports = useCallback(async () => {
    if (!municipioActual) return
    let q = `?municipioId=${municipioActual}&page=${reportsPage}&limit=${PAGE_SIZE}`
    if (reportFilter) q += `&estado=${reportFilter}`
    const data = await api(`/api/admin/reports${q}`)
    if (data) {
      setReports(data.reports || [])
      setReportsMeta({ page: data.page, pages: data.pages, total: data.total })
    }
  }, [municipioActual, reportFilter, reportsPage, api])

  const fetchSessions = useCallback(async () => {
    if (!municipioActual) return
    let q = `?municipioId=${municipioActual}&page=${sessionsPage}&limit=${PAGE_SIZE}`
    if (sessionFilter === 'activas') q += '&activa=true'
    if (sessionFilter === 'finalizadas') q += '&activa=false'
    const data = await api(`/api/admin/sessions${q}`)
    if (data) {
      setSessions(data.sessions || [])
      setSessionsMeta({ page: data.page, pages: data.pages, total: data.total })
    }
  }, [municipioActual, sessionFilter, sessionsPage, api])

  const fetchZonas = useCallback(async () => {
    if (!municipioActual) return
    const data = await api(`/api/admin/zonas/${municipioActual}`)
    if (data) setZonas(data)
  }, [municipioActual, api])

  const fetchMunicipios = useCallback(async () => {
    const data = await api('/api/admin/municipios')
    if (data) setMunicipiosList(data)
  }, [api])

  const fetchUsers = useCallback(async () => {
    let q = `?page=${usersPage}&limit=${PAGE_SIZE}`
    if (userRoleFilter) q += `&role=${userRoleFilter}`
    if (userSearch) q += `&search=${encodeURIComponent(userSearch)}`
    const data = await api(`/api/admin/users${q}`)
    if (data) {
      setUsers(data.users || [])
      setUsersMeta({ page: data.page, pages: data.pages, total: data.total })
    }
  }, [userRoleFilter, userSearch, usersPage, api])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const actions = {
          stats: fetchStats,
          reports: fetchReports,
          sessions: fetchSessions,
          zonas: fetchZonas,
          municipios: fetchMunicipios,
          users: fetchUsers,
        }
        await actions[tab]?.()
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab, municipioActual, fetchStats, fetchReports, fetchSessions, fetchZonas, fetchMunicipios, fetchUsers])

  // Resetear página al cambiar filtros
  useEffect(() => { setReportsPage(1) }, [reportFilter, municipioActual])
  useEffect(() => { setSessionsPage(1) }, [sessionFilter, municipioActual])
  useEffect(() => { setUsersPage(1) }, [userRoleFilter, userSearch])

  const openReportDetail = (r) => {
    setShowReportDetail(r)
    setReportEdit({ actaNumero: r.actaNumero || '', notas: r.comentario || '' })
  }

  const handleReportAction = async (id, estado, extra = {}) => {
    try {
      await api(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, ...extra }),
      })
      setReports(prev => prev.map(r => r.id === id ? { ...r, estado, ...extra } : r))
      if (showReportDetail?.id === id) {
        setShowReportDetail(prev => ({ ...prev, estado, ...extra }))
      }
      notifySuccess('Reporte actualizado')
    } catch (e) { notifyError(e.message) }
  }

  const handleSaveReportDetail = async () => {
    if (!showReportDetail) return
    try {
      const body = { actaNumero: reportEdit.actaNumero, notas: reportEdit.notas }
      await api(`/api/admin/reports/${showReportDetail.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      setReports(prev => prev.map(r =>
        r.id === showReportDetail.id
          ? { ...r, actaNumero: reportEdit.actaNumero, comentario: reportEdit.notas }
          : r
      ))
      notifySuccess('Reporte guardado')
      setShowReportDetail(null)
    } catch (e) { notifyError(e.message) }
  }

  const handleRoleChange = async (id, role) => {
    if (id === user?.id && role !== 'admin') {
      notifyError('No podés quitarte el rol de administrador')
      return
    }
    try {
      await api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      notifySuccess('Rol actualizado')
    } catch (e) { notifyError(e.message) }
  }

  const handleDeleteUser = async (id) => {
    if (id === user?.id) {
      notifyError('No podés eliminar tu propia cuenta')
      return
    }
    if (!confirm('Eliminar este usuario y todos sus datos?')) return
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== id))
      notifySuccess('Usuario eliminado')
    } catch (e) { notifyError(e.message) }
  }

  const handleDeleteReport = async (id) => {
    if (!confirm('Eliminar este reporte?')) return
    try {
      await api(`/api/admin/reports/${id}`, { method: 'DELETE' })
      setReports(prev => prev.filter(r => r.id !== id))
      if (showReportDetail?.id === id) setShowReportDetail(null)
      notifySuccess('Reporte eliminado')
    } catch (e) { notifyError(e.message) }
  }

  const handleDeleteSession = async (id) => {
    if (!confirm('Eliminar esta sesión?')) return
    try {
      await api(`/api/admin/sessions/${id}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
      notifySuccess('Sesión eliminada')
    } catch (e) { notifyError(e.message) }
  }

  const saveZona = async () => {
    try {
      const payload = {
        nombre: zonaForm.nombre,
        ref: zonaForm.ref,
        lat: Number(zonaForm.lat),
        lng: Number(zonaForm.lng),
        capacidad: Number(zonaForm.capacidad),
      }
      if (editZona) {
        await api(`/api/admin/zonas/${editZona.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        notifySuccess('Zona actualizada')
      } else {
        await api(`/api/admin/zonas/${municipioActual}`, { method: 'POST', body: JSON.stringify(payload) })
        notifySuccess('Zona creada')
      }
      setShowZonaForm(false); setEditZona(null)
      setZonaForm({ nombre: '', ref: '', lat: '', lng: '', capacidad: '' })
      fetchZonas()
    } catch (e) { notifyError(e.message) }
  }

  const handleDeleteZona = async (id) => {
    if (!confirm('Eliminar esta zona y todas sus plazas?')) return
    try {
      await api(`/api/admin/zonas/${id}`, { method: 'DELETE' })
      setZonas(prev => prev.filter(z => z.id !== id))
      notifySuccess('Zona eliminada')
    } catch (e) { notifyError(e.message) }
  }

  const saveMunicipio = async () => {
    try {
      const payload = {
        nombre: municipioForm.nombre,
        lat: Number(municipioForm.lat),
        lng: Number(municipioForm.lng),
        tarifaHora: Number(municipioForm.tarifaHora),
      }
      if (editMunicipio) {
        await api(`/api/admin/municipios/${editMunicipio.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        notifySuccess('Municipio actualizado')
      } else {
        await api('/api/admin/municipios', {
          method: 'POST',
          body: JSON.stringify({ ...payload, id: municipioForm.id }),
        })
        notifySuccess('Municipio creado')
      }
      setShowMunicipioForm(false); setEditMunicipio(null)
      setMunicipioForm({ id: '', nombre: '', lat: '', lng: '', tarifaHora: '' })
      fetchMunicipios()
      // Refrescar selector del header
      const data = await api('/api/municipios')
      if (data) setMunicipios(data)
    } catch (e) { notifyError(e.message) }
  }

  const handleDeleteMunicipio = async (id) => {
    if (!confirm('Eliminar este municipio y todas sus zonas?')) return
    try {
      await api(`/api/admin/municipios/${id}`, { method: 'DELETE' })
      setMunicipiosList(prev => prev.filter(m => m.id !== id))
      const data = await api('/api/municipios')
      if (data) {
        setMunicipios(data)
        if (municipioActual === id && data.length > 0) {
          setMunicipioActual(data[0].id)
        }
      }
      notifySuccess('Municipio eliminado')
    } catch (e) { notifyError(e.message) }
  }

  const pctLibre = (z) => {
    if (!z.plazasCount) return '—'
    return `${Math.round(((z.plazasCount - z.ocupadas) / z.plazasCount) * 100)}% libre`
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-denied">
        <h2>Acceso denegado</h2>
        <p>No tenés permisos de administrador.</p>
        <button onClick={() => navigate('/map')}>Volver al mapa</button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-top">
          <button className="admin-back" onClick={() => navigate('/map')}>← Mapa</button>
          <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1>Panel Admin</h1>
          <span className="admin-user">{user?.name}</span>
        </div>
        <div className="admin-header-select">
          <select value={municipioActual || ''} onChange={(e) => setMunicipioActual(e.target.value)}>
            {municipios.length === 0 && <option value="">Sin municipios</option>}
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </header>

      <div className="admin-layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="admin-sidebar-nav">
            {[
              { key: 'stats', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'reports', label: 'Reportes', icon: Flag },
              { key: 'sessions', label: 'Sesiones', icon: Clock },
              { key: 'zonas', label: 'Zonas', icon: MapPin },
              { key: 'municipios', label: 'Municipios', icon: Building2 },
              { key: 'users', label: 'Usuarios', icon: Users },
            ].map(t => (
              <button
                key={t.key}
                className={`sidebar-item ${tab === t.key ? 'activo' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span className="sidebar-icon"><t.icon size={18} /></span>
                <span className="sidebar-label">{t.label}</span>
              </button>
            ))}
            <button
              className="sidebar-item measure-link"
              onClick={() => navigate('/measure')}
            >
              <span className="sidebar-icon"><Ruler size={18} /></span>
              <span className="sidebar-label">Medir plazas</span>
            </button>
          </nav>
        </aside>

        <main className="admin-content">
        {error && <div className="admin-error">{error}</div>}

        {!municipioActual && tab !== 'municipios' && tab !== 'users' && (
          <p className="admin-empty">Seleccioná un municipio para ver los datos.</p>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'stats' && !loading && !stats && municipioActual && (
          <p className="admin-empty">No hay estadísticas disponibles.</p>
        )}
        {tab === 'stats' && stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card verde">
                <span className="stat-num">{stats.activeSessions}</span>
                <span className="stat-label">Activas ahora</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.sessionsHoy}</span>
                <span className="stat-label">Sesiones hoy</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.totalSessions}</span>
                <span className="stat-label">Total sesiones</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">${stats.totalRevenue.toLocaleString()}</span>
                <span className="stat-label">Ingresos totales</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">${Math.round(stats.avgRevenue || 0).toLocaleString()}</span>
                <span className="stat-label">Ticket promedio</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.pendingReports}</span>
                <span className="stat-label">Reportes pendientes</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.verifiedReports}</span>
                <span className="stat-label">Verificados</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.infraccionReports}</span>
                <span className="stat-label">Infracciones</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{stats.usersCount}</span>
                <span className="stat-label">Usuarios</span>
              </div>
            </div>

            <div className="admin-section">
              <h3 className="section-title">Top zonas por uso</h3>
              <div className="top-zonas">
                {stats.topZonas?.length === 0 && <p className="admin-empty">Sin datos de zonas</p>}
                {stats.topZonas?.map((z, i) => (
                  <div key={z.zonaNombre} className="top-zona-item">
                    <span className="top-zona-rank">#{i + 1}</span>
                    <span className="top-zona-name">{z.zonaNombre}</span>
                    <span className="top-zona-count">{z._count.id} sesiones</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-section">
              <h3 className="section-title">Últimas sesiones</h3>
              <div className="admin-list">
                {stats.ultimasSesiones?.length === 0 && <p className="admin-empty">Sin sesiones recientes</p>}
                {stats.ultimasSesiones?.map(s => (
                  <div key={s.id} className="admin-card compact">
                    <div className="card-header">
                      <span className="card-patente">{s.patente}</span>
                      <span className={`card-estado ${s.fin ? 'verificado' : 'pendiente'}`}>
                        {s.fin ? 'Finalizada' : 'Activa'}
                      </span>
                    </div>
                    <div className="card-body inline">
                      <span>{s.zonaNombre}</span>
                      <span>{s.user?.name}</span>
                      {s.montoTotal != null && <span>${s.montoTotal}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── REPORTES ── */}
        {tab === 'reports' && (
          <>
            <div className="filter-bar">
              {['', 'pendiente', 'verificado', 'infraccion', 'descartado'].map(f => (
                <button key={f} className={`filter-chip ${reportFilter === f ? 'activo' : ''}`} onClick={() => setReportFilter(f)}>
                  {f || 'Todos'}
                </button>
              ))}
            </div>
            <div className="admin-list">
              {reports.length === 0 && !loading && <p className="admin-empty">No hay reportes</p>}
              {reports.map(r => (
                <div key={r.id} className="admin-card">
                  <div className="card-header">
                    <span className="card-patente">{r.patente}</span>
                    <span className={`card-estado ${r.estado}`}>{r.estado}</span>
                  </div>
                  <div className="card-body">
                    <span>Zona: {r.zonaNombre}</span>
                    <span>Por: {r.user?.name || 'Anónimo'}</span>
                    {r.comentario && <span>"{r.comentario}"</span>}
                    {r.actaNumero && <span className="card-acta">{r.actaNumero}</span>}
                    <span>{new Date(r.createdAt).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => openReportDetail(r)}>Ver detalle</button>
                    <button onClick={() => handleReportAction(r.id, 'verificado')}>Verificar</button>
                    <button onClick={() => handleReportAction(r.id, 'infraccion')}>Infracción</button>
                    <button onClick={() => handleReportAction(r.id, 'descartado')}>Descartar</button>
                    <button className="btn-danger" onClick={() => handleDeleteReport(r.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={reportsMeta.page} pages={reportsMeta.pages} total={reportsMeta.total} onPage={setReportsPage} />
          </>
        )}

        {/* ── SESIONES ── */}
        {tab === 'sessions' && (
          <>
            <div className="filter-bar">
              {[['', 'Todas'], ['activas', 'Activas'], ['finalizadas', 'Finalizadas']].map(([val, label]) => (
                <button key={val} className={`filter-chip ${sessionFilter === val ? 'activo' : ''}`} onClick={() => setSessionFilter(val)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="admin-list">
              {sessions.length === 0 && !loading && <p className="admin-empty">No hay sesiones</p>}
              {sessions.map(s => {
                const mins = s.fin
                  ? Math.ceil((new Date(s.fin) - new Date(s.inicio)) / 60000)
                  : Math.ceil((Date.now() - new Date(s.inicio)) / 60000)
                return (
                  <div key={s.id} className="admin-card compact">
                    <div className="card-header">
                      <span className="card-patente">{s.patente}</span>
                      <span className={`card-estado ${s.fin ? 'verificado' : 'pendiente'}`}>
                        {s.fin ? 'Finalizada' : 'Activa'} · {mins} min
                      </span>
                    </div>
                    <div className="card-body inline">
                      <span>{s.zonaNombre}</span>
                      <span>{s.user?.name}</span>
                      {s.calle && <span>{s.calle}</span>}
                      {s.montoTotal != null && <span>${s.montoTotal}</span>}
                      {s.comprobante && <span className="card-acta">{s.comprobante}</span>}
                    </div>
                    <div className="card-actions">
                      <button className="btn-danger" onClick={() => handleDeleteSession(s.id)}>Eliminar</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={sessionsMeta.page} pages={sessionsMeta.pages} total={sessionsMeta.total} onPage={setSessionsPage} />
          </>
        )}

        {/* ── ZONAS ── */}
        {tab === 'zonas' && (
          <>
            <button className="admin-btn-create" onClick={() => { setShowZonaForm(true); setEditZona(null); setZonaForm({ nombre: '', ref: '', lat: '', lng: '', capacidad: '' }) }}>
              + Nueva zona
            </button>

            {showZonaForm && (
              <div className="admin-form-modal">
                <div className="admin-form-card">
                  <h3>{editZona ? 'Editar zona' : 'Nueva zona'}</h3>
                  <div className="form-grid">
                    <label>Nombre <input value={zonaForm.nombre} onChange={e => setZonaForm(p => ({ ...p, nombre: e.target.value }))} /></label>
                    <label>Referencia <input value={zonaForm.ref} onChange={e => setZonaForm(p => ({ ...p, ref: e.target.value }))} /></label>
                    <label>Latitud <input type="number" step="any" value={zonaForm.lat} onChange={e => setZonaForm(p => ({ ...p, lat: e.target.value }))} /></label>
                    <label>Longitud <input type="number" step="any" value={zonaForm.lng} onChange={e => setZonaForm(p => ({ ...p, lng: e.target.value }))} /></label>
                    <label>Capacidad <input type="number" value={zonaForm.capacidad} onChange={e => setZonaForm(p => ({ ...p, capacidad: e.target.value }))} /></label>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setShowZonaForm(false)}>Cancelar</button>
                    <button className="btn-save" onClick={saveZona}>{editZona ? 'Guardar' : 'Crear'}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-list">
              {zonas.length === 0 && !loading && <p className="admin-empty">No hay zonas en este municipio</p>}
              {zonas.map(z => (
                <div key={z.id} className="admin-card">
                  <div className="card-header">
                    <span className="card-nombre">{z.nombre}</span>
                    <span className="card-ref">{z.ref}</span>
                  </div>
                  <div className="card-body inline">
                    <span>Cap: {z.capacidad}</span>
                    <span>Ocupadas: {z.ocupadas}/{z.plazasCount}</span>
                    <span>{pctLibre(z)}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => {
                      setEditZona(z)
                      setZonaForm({ nombre: z.nombre, ref: z.ref, lat: z.lat, lng: z.lng, capacidad: z.capacidad })
                      setShowZonaForm(true)
                    }}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDeleteZona(z.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MUNICIPIOS ── */}
        {tab === 'municipios' && (
          <>
            <button className="admin-btn-create" onClick={() => { setShowMunicipioForm(true); setEditMunicipio(null); setMunicipioForm({ id: '', nombre: '', lat: '', lng: '', tarifaHora: '' }) }}>
              + Nuevo municipio
            </button>

            {showMunicipioForm && (
              <div className="admin-form-modal">
                <div className="admin-form-card">
                  <h3>{editMunicipio ? 'Editar municipio' : 'Nuevo municipio'}</h3>
                  <div className="form-grid">
                    <label>ID <input value={municipioForm.id} onChange={e => setMunicipioForm(p => ({ ...p, id: e.target.value }))} disabled={!!editMunicipio} /></label>
                    <label>Nombre <input value={municipioForm.nombre} onChange={e => setMunicipioForm(p => ({ ...p, nombre: e.target.value }))} /></label>
                    <label>Latitud <input type="number" step="any" value={municipioForm.lat} onChange={e => setMunicipioForm(p => ({ ...p, lat: e.target.value }))} /></label>
                    <label>Longitud <input type="number" step="any" value={municipioForm.lng} onChange={e => setMunicipioForm(p => ({ ...p, lng: e.target.value }))} /></label>
                    <label>Tarifa/hora <input type="number" value={municipioForm.tarifaHora} onChange={e => setMunicipioForm(p => ({ ...p, tarifaHora: e.target.value }))} /></label>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setShowMunicipioForm(false)}>Cancelar</button>
                    <button className="btn-save" onClick={saveMunicipio}>{editMunicipio ? 'Guardar' : 'Crear'}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-list">
              {municipiosList.length === 0 && !loading && <p className="admin-empty">No hay municipios</p>}
              {municipiosList.map(m => (
                <div key={m.id} className="admin-card">
                  <div className="card-header">
                    <span className="card-nombre">{m.nombre}</span>
                    <span className="card-ref">ID: {m.id}</span>
                  </div>
                  <div className="card-body inline">
                    <span>Tarifa: ${m.tarifaHora}/h</span>
                    <span>Zonas: {m._count?.zonas || 0}</span>
                    <span>Lat: {m.lat}, Lng: {m.lng}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => { setEditMunicipio(m); setMunicipioForm({ id: m.id, nombre: m.nombre, lat: m.lat, lng: m.lng, tarifaHora: m.tarifaHora }); setShowMunicipioForm(true) }}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDeleteMunicipio(m.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── USUARIOS ── */}
        {tab === 'users' && (
          <>
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={userSearchInput}
                onChange={e => setUserSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setUserSearch(userSearchInput) }}
                className="filter-input"
              />
              <button className="filter-chip" onClick={() => setUserSearch(userSearchInput)}>Buscar</button>
              {['', 'user', 'admin', 'inspector'].map(r => (
                <button key={r} className={`filter-chip ${userRoleFilter === r ? 'activo' : ''}`} onClick={() => setUserRoleFilter(r)}>
                  {r || 'Todos'}
                </button>
              ))}
            </div>
            <div className="admin-list">
              {users.length === 0 && !loading && <p className="admin-empty">No hay usuarios</p>}
              {users.map(u => (
                <div key={u.id} className="admin-card">
                  <div className="card-header">
                    <span className="card-nombre">{u.name}{u.id === user?.id ? ' (vos)' : ''}</span>
                    <span className={`card-role ${u.role}`}>{u.role}{u.legajo ? ` #${u.legajo}` : ''}</span>
                  </div>
                  <div className="card-body inline">
                    <span>Patente: {u.patente || '—'}</span>
                    <span>Email: {u.email || '—'}</span>
                    <span>Sesiones: {u._count?.sessions || 0}</span>
                    <span>Reportes: {u._count?.reports || 0}</span>
                  </div>
                  <div className="card-actions">
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} disabled={u.id === user?.id}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="inspector">Inspector</option>
                    </select>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={u.id === user?.id}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={usersMeta.page} pages={usersMeta.pages} total={usersMeta.total} onPage={setUsersPage} />
          </>
        )}

        {loading && <div className="admin-loading"><div className="spinner" /></div>}
      </main>
    </div>

      {/* Modal detalle de reporte */}
      {showReportDetail && (
        <div className="admin-form-modal" onClick={() => setShowReportDetail(null)}>
          <div className="admin-form-card report-detail" onClick={e => e.stopPropagation()}>
            <h3>Reporte — {showReportDetail.patente}</h3>
            <div className="report-detail-info">
              <p><strong>Zona:</strong> {showReportDetail.zonaNombre}</p>
              <p><strong>Estado:</strong> {showReportDetail.estado}</p>
              <p><strong>Reportado por:</strong> {showReportDetail.user?.name || 'Anónimo'}</p>
              <p><strong>Fecha:</strong> {new Date(showReportDetail.createdAt).toLocaleString('es-AR')}</p>
            </div>
            {showReportDetail.fotoUrl && (
              <img src={showReportDetail.fotoUrl} alt="Foto del reporte" className="report-detail-foto" />
            )}
            <div className="form-grid">
              <label>
                Nº de acta
                <input
                  value={reportEdit.actaNumero}
                  onChange={e => setReportEdit(p => ({ ...p, actaNumero: e.target.value }))}
                  placeholder="Ej: ACTA-2026-001"
                />
              </label>
              <label>
                Notas / comentario
                <textarea
                  value={reportEdit.notas}
                  onChange={e => setReportEdit(p => ({ ...p, notas: e.target.value }))}
                  rows={3}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowReportDetail(null)}>Cerrar</button>
              <button className="btn-save" onClick={handleSaveReportDetail}>Guardar</button>
              <button onClick={() => handleReportAction(showReportDetail.id, 'infraccion', { actaNumero: reportEdit.actaNumero, notas: reportEdit.notas })}>
                Marcar infracción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
