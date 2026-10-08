import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted">
      <header className="flex items-center justify-center p-6">
        <span className="text-lg font-semibold tracking-tight">Matcha</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-6 md:px-10">
        <div className="w-full max-w-4xl">
          <Suspense fallback={<Spinner className="mx-auto" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <footer className="p-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Matcha
      </footer>
    </div>
  )
}
