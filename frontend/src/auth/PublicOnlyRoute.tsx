import { AuthRoute } from './AuthRoute'

export function PublicOnlyRoute() {
  return <AuthRoute requireAuth={false} redirectTo="/" />
}
