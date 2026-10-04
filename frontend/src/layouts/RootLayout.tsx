import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/ui/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { SearchForm } from "@/components/ui/search-form"

export function RootLayout() {
  const { logout } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Matcha
          </Link>
          <SearchForm />
          <div className="ml-auto">
            <Button variant="ghost" size="sm" type="button" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <Outlet />
        </main>

        <footer className="border-t">
          <div className="px-6 py-6 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Matcha
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
