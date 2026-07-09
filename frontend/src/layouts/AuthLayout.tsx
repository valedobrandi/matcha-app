import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <Outlet />
      </div>
    </div>
  )
}
