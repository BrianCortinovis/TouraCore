import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { ArrowLeft } from 'lucide-react'
import AgencyTenantBillingClient from './agency-tenant-billing-client'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function AgencyClientBilling({ params }: Props) {
  const { tenantSlug } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const supabase = await createServerSupabaseClient()
  const admin = await createServiceRoleClient()

  // Verifica che agency dell'utente ha link attivo con il tenant
  const { data: agencyMember } = await supabase
    .from('agency_memberships')
    .select('agency_id, agency:agencies(id, name, slug, can_grant_free, free_grant_quota)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const agency = (agencyMember?.agency as unknown) as
    | { id: string; name: string; slug: string; can_grant_free: boolean; free_grant_quota: number | null }
    | null
  if (!agency) notFound()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) notFound()

  const { data: link } = await admin
    .from('agency_tenant_links')
    .select('*')
    .eq('agency_id', agency.id)
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) notFound()

  const [{ data: catalog }, { data: overrides }, { data: remainingRaw }] = await Promise.all([
    admin
      .from('module_catalog')
      .select('code, label, base_price_eur')
      .eq('active', true)
      .order('order_idx', { ascending: true }),
    admin
      .from('module_overrides')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true),
    admin.rpc('agency_can_grant_free_remaining', { p_agency: agency.id }),
  ])

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <Link
        href="/agency/billing"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Billing agenzia
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestione moduli e override per questo cliente.
        </p>
      </div>

      <AgencyTenantBillingClient
        tenantId={tenant.id}
        agencyId={agency.id}
        agencyCanGrantFree={agency.can_grant_free}
        freeGrantRemaining={remainingRaw as number | null}
        tenantModules={(tenant.modules ?? {}) as Record<string, { active: boolean; source: string }>}
        catalog={catalog ?? []}
        overrides={overrides ?? []}
      />
    </div>
  )
}
