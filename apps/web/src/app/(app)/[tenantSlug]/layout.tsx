import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantSlug } = await params
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    redirect('/login')
  }

  // Risolvi tenantSlug → tenant
  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    notFound()
  }

  // Verifica accesso: membership diretta o agency link
  const isMember = bootstrap.tenants.some((t) => t.id === tenant.id)

  if (!isMember) {
    // Verifica accesso via agenzia
    const { data: agencyLink } = await supabase
      .from('agency_tenant_links')
      .select('agency_id, status')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (!agencyLink) {
      notFound()
    }
  }

  return <>{children}</>
}
