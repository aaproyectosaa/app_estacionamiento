import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { notifyError, notifySuccess } from '../lib/notify'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, token, logout, updateUser } = useAuthStore()
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', patente: '' })

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/sessions/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleEdit = () => {
    setForm({ name: user?.name || '', patente: user?.patente || '' })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        updateUser(data.user)
        setEditing(false)
        notifySuccess('Perfil actualizado')
      } else {
        const err = await res.json()
        notifyError(err.message || 'Error al actualizar')
      }
    } catch {
      notifyError('Error al actualizar perfil')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-niebla">
      <div className="bg-azul text-white p-4">
        <div className="max-w-md md:max-w-xl lg:max-w-3xl mx-auto flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-family-condensed)] text-xl font-bold uppercase tracking-wide">
          Mi perfil
        </h1>
        </div>
      </div>

      <div className="p-4 max-w-md md:max-w-xl lg:max-w-3xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-azul rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold font-[family-name:var(--font-family-condensed)]">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Nombre"
                  />
                  <input
                    type="text"
                    value={form.patente}
                    onChange={(e) => setForm({ ...form, patente: e.target.value.toUpperCase().slice(0, 8) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-family-condensed)] tracking-widest uppercase"
                    placeholder="Patente"
                    maxLength={8}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-verde text-white rounded-lg px-4 py-1.5 text-sm font-semibold">Guardar</button>
                    <button onClick={() => setEditing(false)} className="text-gris text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{user?.name || 'Usuario'}</h2>
                  <p className="text-gris text-sm">{user?.email || 'email@ejemplo.com'}</p>
                </>
              )}
            </div>
          </div>

          {!editing && (
            <div className="space-y-4">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full bg-azul text-white rounded-xl py-3 font-semibold hover:bg-blue-800 transition-colors"
                >
                  Panel de administración
                </button>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gris mb-1">
                    Patente guardada
                  </label>
                  <p className="text-lg font-[family-name:var(--font-family-condensed)] font-bold tracking-widest uppercase">
                    {user?.patente || 'No configurada'}
                  </p>
                </div>
                <button onClick={handleEdit} className="text-azul text-sm font-semibold">
                  Editar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gris mb-1">
                  Miembro desde
                </label>
                <p className="text-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-AR') : 'Hoy'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Historial reciente</h3>
          {historyLoading ? (
            <p className="text-gris text-sm">Cargando...</p>
          ) : history.length === 0 ? (
            <p className="text-gris text-sm">Tus estacionamientos aparecerán acá.</p>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {history.map((s) => (
                <div key={s.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{s.zonaNombre}</p>
                      <p className="text-gris text-xs">{s.patente}</p>
                    </div>
                    <p className="font-bold text-azul">${s.montoTotal || 0}</p>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gris">
                    <span>{formatDate(s.inicio)}</span>
                    <span>{s.comprobante}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full lg:w-48 lg:mx-auto bg-rojo text-white rounded-xl py-3 font-semibold hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
