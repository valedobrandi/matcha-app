import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function RootLayout() {
  const { logout } = useAuth()

  return (
    <div>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
