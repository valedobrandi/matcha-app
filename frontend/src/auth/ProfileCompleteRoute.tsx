import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProfileCompleteRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading || (isAuthenticated && !user)) {
    return null
  }

  if (user && !user.profile_completed) {
    return <Navigate to="/profile/complete" replace />
  }

  return <Outlet />
}
