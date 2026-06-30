import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute() {
  const { session, isAdmin, loading } = useAuth()

  if (loading) {
    return <p className="poll-loading">Loading…</p>
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  if (!isAdmin) {
    return (
      <div className="poll-page art-deco-border">
        <p className="poll-message poll-message-error">
          Your account is not authorized for admin access.
        </p>
      </div>
    )
  }

  return <Outlet />
}
