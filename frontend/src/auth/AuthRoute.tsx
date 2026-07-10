import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

type AuthRouteProps = {
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthRoute({ requireAuth = true, redirectTo }: AuthRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (requireAuth) {
    if (!isAuthenticated) {
      return <Navigate to={redirectTo ?? '/auth/login'} replace />
    }

    return <Outlet />
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo ?? '/'} replace />
  }

  return <Outlet />
}
