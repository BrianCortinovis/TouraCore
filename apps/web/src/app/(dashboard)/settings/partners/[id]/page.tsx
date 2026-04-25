import { notFound, redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  getPartnerById,
  listPartnerLinks,
  listPartnerCommissions,
  getPartnerStats,
} from '@touracore/partners/server'
import { PartnerDetailClient } from './partner-detail-client'
import { createServerSupabaseClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const b = await getAuthBootstrapData()
  if (!b.tenant) redirect('/login')

  const partner = await getPartnerById({ id, tenantId: b.tenant.id })
  if (!partner) notFound()

  const [links, commissions, stats, entities] = await Promise.all([
    listPartnerLinks({ partnerId: id, tenantId: b.tenant.id }),
    listPartnerCommissions({ tenantId: b.tenant.id, partnerId: id, limit: 50 }),
    getPartnerStats({ partnerId: id, tenantId: b.tenant.id }),
    (async () => {
      const supabase = await createServerSupabaseClient()
      const { data } = await supabase
        .from('entities')
        .select('id, slug, name, kind')
        .eq('tenant_id', b.tenant!.id)
        .eq('is_active', true)
        .order('name')
      return (data ?? []) as Array<{ id: string; slug: string; name: string; kind: string }>
    })(),
  ])

  // Fetch api keys count
  const supabase = await createServerSupabaseClient()
  const { data: apiKeys } = await supabase
    .from('partner_api_keys')
    .select('id, key_id, name, scope, environment, secret_last4, active, last_used_at, created_at')
    .eq('partner_id', id)
    .order('created_at', { ascending: false })

  return (
    <PartnerDetailClient
      partner={partner}
      links={links}
      commissions={commissions}
      stats={stats}
      entities={entities}
      apiKeys={(apiKeys ?? []) as never}
      tenantSlug={b.tenant.slug ?? ''}
    />
  )
}
