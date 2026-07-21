import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import '../styles/welcome.css'

export default function WelcomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/map" replace />
  }

  return (
    <div className="welcome">
      <div className="welcome-grid" />

      <div className="welcome-content">
        <div className="welcome-logo">
          <span>E</span>
        </div>

        <h1 className="welcome-title">Hay Lugar</h1>
        <p className="welcome-subtitle">Estacionamiento medido, simple y justo</p>

        <div className="welcome-steps">
          <div className="welcome-step">
            <div className="welcome-step-num">1</div>
            <p>Mirá el mapa y encontrá lugar al instante</p>
          </div>
          <div className="welcome-step">
            <div className="welcome-step-num">2</div>
            <p>Estacioná y pagá por minuto — los primeros 15 son gratis</p>
          </div>
          <div className="welcome-step">
            <div className="welcome-step-num">3</div>
            <p>Reportá autos sin pagar y cuidá tu ciudad</p>
          </div>
        </div>

        <button className="welcome-btn-primary" onClick={() => navigate('/setup')}>
          Empezar
        </button>
        <button className="welcome-btn-secondary" onClick={() => navigate('/login')}>
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}
