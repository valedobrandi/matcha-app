import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProfileIncompleteRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading || (isAuthenticated && !user)) {
    return null
  }

  if (user?.profile_completed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
