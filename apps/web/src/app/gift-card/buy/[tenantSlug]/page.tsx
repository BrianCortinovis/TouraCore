import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { listGiftCardDesigns } from '@touracore/vouchers/server'
import { GiftCardBuyClient } from './gift-card-buy-client'

export const dynamic = 'force-dynamic'

export default async function GiftCardBuyPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, country, modules')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) notFound()

  const designs = await listGiftCardDesigns({ tenantId: tenant.id, includeSystem: true })

  const modules = (tenant.modules as Record<string, { active?: boolean } | boolean>) ?? {}
  const activeVerticals: string[] = []
  for (const key of ['hospitality', 'restaurant', 'bike_rental', 'experiences', 'wellness']) {
    const m = modules[key]
    if (typeof m === 'boolean' ? m : m?.active) activeVerticals.push(key)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        <header style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' }}>
            Gift Card · {tenant.name}
          </p>
          <h1 style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700 }}>
            Regala un’esperienza
          </h1>
          <p style={{ marginTop: 8, color: '#4b5563', fontSize: 15 }}>
            Acquista una gift card digitale. Il destinatario la riceverà via email con un messaggio personale.
          </p>
        </header>

        <GiftCardBuyClient
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          tenantName={tenant.name}
          designs={designs}
          activeVerticals={activeVerticals}
        />
      </div>
    </div>
  )
}
