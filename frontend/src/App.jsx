import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import NotifyHost from './components/NotifyHost'
import WelcomePage from './pages/WelcomePage'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import InspectorPage from './pages/InspectorPage'
import MeasurePage from './pages/MeasurePage'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  if (!hydrated) return null
  return isAuthenticated ? children : <Navigate to="/" />
}

export default function App() {
  return (
    <>
    <NotifyHost />
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/measure" element={<ProtectedRoute><MeasurePage /></ProtectedRoute>} />
      <Route path="/inspector" element={<ProtectedRoute><InspectorPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </>
  )
}
