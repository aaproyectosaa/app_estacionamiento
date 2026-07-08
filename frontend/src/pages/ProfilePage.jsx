import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-niebla">
      {/* Header */}
      <div className="bg-azul text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-family-condensed)] text-xl font-bold uppercase tracking-wide">
          Mi perfil
        </h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-azul rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold font-[family-name:var(--font-family-condensed)]">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name || 'Usuario'}</h2>
              <p className="text-gris text-sm">{user?.email || 'email@ejemplo.com'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gris mb-1">
                Patente guardada
              </label>
              <p className="text-lg font-[family-name:var(--font-family-condensed)] font-bold tracking-widest uppercase">
                {user?.patente || 'No configurada'}
              </p>
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
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Historial reciente</h3>
          <p className="text-gris text-sm">Tus estacionamientos aparecerán acá.</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-rojo text-white rounded-xl py-3 font-semibold hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
