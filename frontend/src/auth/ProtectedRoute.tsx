import { AuthRoute } from './AuthRoute'

export function ProtectedRoute() {
  return <AuthRoute requireAuth={true} redirectTo="/auth/login" />
}
