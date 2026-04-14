import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

// Route group (account) legacy — tutto l'account è ora dentro (app)/[tenantSlug]/settings.
// Redirect forzato per tutte le pagine figlie.
export default async function AccountLegacyLayout({
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

  redirect(`/${bootstrap.tenant.slug}/settings/profile`)

  return <>{children}</>
}
