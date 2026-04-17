import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { ArrowLeft } from 'lucide-react'
import TenantBillingClient from './tenant-billing-client'

interface Props {
  params: Promise<{ tenantId: string }>
}

export default async function SuperadminTenantBilling({ params }: Props) {
  const { tenantId } = await params
  const admin = await createServiceRoleClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant) notFound()

  const [{ data: catalog }, { data: overrides }, { data: items }, { data: profile }] =
    await Promise.all([
      admin
        .from('module_catalog')
        .select('code, label, base_price_eur, pausable')
        .eq('active', true)
        .order('order_idx', { ascending: true }),
      admin
        .from('module_overrides')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true),
      admin.from('subscription_items').select('*').eq('tenant_id', tenantId),
      admin
        .from('billing_profiles')
        .select('*')
        .eq('scope', 'tenant')
        .eq('scope_id', tenantId)
        .eq('active', true),
    ])

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <Link
        href="/superadmin/billing/overrides"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna agli override
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Billing tenant <code className="text-xs">{tenant.slug}</code>
        </p>
      </div>

      <TenantBillingClient
        tenantId={tenantId}
        tenantName={tenant.name}
        tenantModules={(tenant.modules ?? {}) as Record<string, { active: boolean; source: string }>}
        catalog={catalog ?? []}
        overrides={overrides ?? []}
        subscriptionItems={items ?? []}
        profiles={profile ?? []}
      />
    </div>
  )
}
