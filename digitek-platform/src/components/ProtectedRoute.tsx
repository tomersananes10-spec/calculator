import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const BYPASS_AUTH = true // dev mode — remove before production

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (BYPASS_AUTH) return <>{children}</>

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text3)',
        fontSize: '14px',
      }}>
        טוען...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
