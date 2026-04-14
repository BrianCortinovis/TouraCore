import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

// Tutto il route group (dashboard) è legacy.
// Le pagine figlie restano come componenti usati dai re-export in (app),
// ma l'accesso diretto alle route legacy reindirizza all'area app.
export default async function DashboardLegacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    redirect('/login')
  }

  if (!bootstrap.tenant) {
    redirect('/onboarding')
  }

  // Redirect a area account del tenant attivo
  redirect(`/${bootstrap.tenant.slug}`)

  return <>{children}</>
}
