import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

// Route group (cms) legacy — tutte le strutture sono ora gestite via (app)/[tenantSlug]/stays/[entitySlug].
// Redirect forzato.
export default async function CmsLegacyLayout({
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

  redirect(`/${bootstrap.tenant.slug}/stays`)

  return <>{children}</>
}
