import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { AuthProvider } from '@touracore/auth/provider'
import { AppTopBar } from './app-topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    redirect('/login')
  }

  return (
    <AuthProvider initialData={bootstrap}>
      <div className="min-h-screen bg-gray-50">
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
