import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { notifyError } from '../lib/notify'
import { AlertCircle } from 'lucide-react'
import '../styles/setup.css'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [patente, setPatente] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, patente }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error al ingresar')

      login(data.user, data.token)
      navigate('/map')
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
          <p className="setup-subtitle">Estacionamiento medido</p>
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
            <label htmlFor="nombre">Tu nombre</label>
            <div className="setup-input-wrap">
              <span className="setup-input-icon" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <input
                id="nombre"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="setup-input with-icon"
                placeholder="Ej: Juan"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="setup-field">
            <label htmlFor="patente">Patente</label>
            <p className="setup-field-hint">Opcional, la usamos para iniciar el medidor más rápido</p>
            <input
              id="patente"
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value.toUpperCase().slice(0, 8))}
              maxLength={8}
              className="setup-input patente"
              placeholder="ABC123"
              autoComplete="off"
            />
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
      </div>
    </div>
  )
}
