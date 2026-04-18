import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { listCredits, getCreditStats, listGiftCardDesigns } from '@touracore/vouchers/server'
import { CreditsStudio } from './credits-studio'

export const dynamic = 'force-dynamic'

type SearchParams = { tab?: string; q?: string; status?: string }

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.tenant) redirect('/login')

  const tab = (sp.tab ?? 'gift_card') as 'gift_card' | 'voucher' | 'promo_code' | 'store_credit'

  const [creditsRes, stats, designs, entities] = await Promise.all([
    listCredits({
      tenantId: bootstrap.tenant.id,
      kind: tab,
      search: sp.q,
      status: (sp.status as never) || undefined,
      limit: 50,
    }),
    getCreditStats({ tenantId: bootstrap.tenant.id }),
    listGiftCardDesigns({ tenantId: bootstrap.tenant.id, includeSystem: true }),
    // Lista entities per scope picker
    (async () => {
      const { createServerSupabaseClient } = await import('@touracore/db/server')
      const supabase = await createServerSupabaseClient()
      const { data } = await supabase
        .from('entities')
        .select('id, slug, name, kind')
        .eq('tenant_id', bootstrap.tenant!.id)
        .eq('is_active', true)
        .order('kind', { ascending: true })
        .order('name', { ascending: true })
      return data ?? []
    })(),
  ])

  return (
    <CreditsStudio
      tenantSlug={bootstrap.tenant.slug ?? ''}
      tenantName={bootstrap.tenant.name ?? 'Tenant'}
      activeTab={tab}
      credits={creditsRes.rows}
      totalCredits={creditsRes.total}
      stats={stats}
      designs={designs}
      entities={entities as Array<{ id: string; slug: string; name: string; kind: string }>}
      filters={{ q: sp.q ?? '', status: sp.status ?? '' }}
    />
  )
}
