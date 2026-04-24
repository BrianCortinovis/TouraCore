import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
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

  // Superadmin non accede al CMS dei tenant — usa /platform/clients per gestione
  const adminClient = await createServiceRoleClient()
  const { data: platformAdmin } = await adminClient
    .from('platform_admins')
    .select('id')
    .eq('user_id', bootstrap.user.id)
    .maybeSingle()
  if (platformAdmin) {
    redirect('/platform/clients')
  }

  // Risolvi tenantSlug → tenant
  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules, billing_grace_until')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    notFound()
  }

  // Verifica accesso: membership diretta o agency link
  const isMember = bootstrap.tenants.some((t) => t.id === tenant.id)

  if (!isMember) {
    const { data: agencyMemberships } = await supabase
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', bootstrap.user.id)
      .eq('is_active', true)

    const agencyIds = (agencyMemberships ?? []).map((membership) => membership.agency_id)

    if (agencyIds.length === 0) {
      notFound()
    }

    // Verifica accesso via agenzia dell'utente corrente
    const { data: agencyLink } = await supabase
      .from('agency_tenant_links')
      .select('agency_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .in('agency_id', agencyIds)
      .maybeSingle()

    if (!agencyLink) {
      notFound()
    }
  }

  const graceUntil = (tenant as { billing_grace_until?: string | null }).billing_grace_until ?? null
  const graceDate = graceUntil ? new Date(graceUntil) : null
  const graceActive = graceDate && graceDate > new Date()

  return (
    <>
      {graceActive && graceDate && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          ⚠️ Pagamento fallito. Aggiorna il metodo entro il {graceDate.toLocaleDateString('it-IT')} per evitare disattivazione moduli.{' '}
          <a href={`/${tenantSlug}/settings/billing`} className="underline">
            Vai alla fatturazione
          </a>
        </div>
      )}
      {children}
    </>
  )
}
