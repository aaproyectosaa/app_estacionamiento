import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { notifyError } from '../lib/notify'
import { AlertCircle } from 'lucide-react'
import '../styles/setup.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      if (data.user.role === 'admin') {
        navigate('/admin')
      } else if (data.user.role === 'inspector') {
        navigate('/inspector')
      } else {
        navigate('/map')
      }
    } catch (err) {
      setError(err.message)
      notifyError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-logo" aria-hidden="true">
            <span>E</span>
          </div>
          <h1 className="setup-title">Hay Lugar</h1>
          <p className="setup-subtitle">Iniciar sesión</p>
        </div>

        <hr className="setup-divider" />

        <form onSubmit={handleSubmit} className="setup-form">
          {error && (
            <div className="setup-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="setup-field">
            <label htmlFor="email">Email</label>
            <div className="setup-input-wrap">
              <span className="setup-input-icon" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="setup-input with-icon"
                placeholder="admin@admin.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="setup-field">
            <label htmlFor="password">Contraseña</label>
            <div className="setup-input-wrap">
              <span className="setup-input-icon" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="setup-input with-icon"
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="setup-btn">
            {loading ? (
              <>
                <span className="spinner" />
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <span>Ingresar</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="setup-links">
          <Link to="/setup" className="setup-link">Entrar como invitado</Link>
        </div>
      </div>
    </div>
  )
}
