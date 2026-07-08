import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión')

      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-azul flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-azul rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl font-[family-name:var(--font-family-condensed)]">E</span>
          </div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-family-condensed)] uppercase tracking-wide">
            Hay Lugar
          </h1>
          <p className="text-gris mt-1">Iniciá sesión para estacionar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gris mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-gray-200 rounded-xl p-4 text-lg focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gris mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-2 border-gray-200 rounded-xl p-4 text-lg focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-verde text-white rounded-xl p-4 text-xl font-bold uppercase tracking-wide font-[family-name:var(--font-family-condensed)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-gris text-sm mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-azul font-semibold hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
