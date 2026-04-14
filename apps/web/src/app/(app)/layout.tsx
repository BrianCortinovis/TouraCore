import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { AuthProvider } from '@touracore/auth/provider'
import { AppTopBar } from './app-topbar'

// Tutte le pagine sotto (app) richiedono autenticazione e accesso Supabase,
// quindi sono sempre dinamiche — evita di provare static generation al build.
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    redirect('/login')
  }

  return (
    <AuthProvider initialData={bootstrap}>
      <div className="min-h-screen bg-gray-50">
        <AppTopBar />
        <main className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
