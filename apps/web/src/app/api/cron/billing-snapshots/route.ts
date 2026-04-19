import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { stripeUpdateSubscriptionItemQuantity } from '@/lib/stripe-sub-sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MODULE_TO_KIND: Record<string, string> = {
  hospitality: 'accommodation',
  restaurant: 'restaurant',
  wellness: 'wellness',
  experiences: 'activity',
  bike_rental: 'bike_rental',
  moto_rental: 'moto_rental',
  ski_school: 'ski_school',
}

export async function GET(req: Request) {
  return handler(req)
}

export async function POST(req: Request) {
  return handler(req)
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const now = new Date()
  const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)

  const { data: catalog } = await supabase
    .from('module_catalog')
    .select('code, base_price_eur, price_per_unit_eur')
    .eq('active', true)

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, modules')
    .eq('is_active', true)

  if (!catalog || !tenants) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  let snapshotsCreated = 0
  let skipped = 0

  for (const t of tenants) {
    const modules = (t.modules ?? {}) as Record<string, { active: boolean; source: string }>
    for (const mod of catalog) {
      const modState = modules[mod.code]
      if (!modState?.active) continue
      const kind = MODULE_TO_KIND[mod.code]
      if (!kind) continue

      const { count } = await supabase
        .from('entities')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .eq('kind', kind)
        .eq('is_active', true)

      const entityCount = count ?? 0
      const base = Number(mod.base_price_eur)
      const unit = Number(mod.price_per_unit_eur)
      const extraUnits = Math.max(0, entityCount - 1)
      const total = base + extraUnits * unit

      // Stripe qty sync: update subscription_item quantity = entityCount
      let stripeSyncStatus: 'pending' | 'synced' | 'failed' | 'skipped' = 'skipped'
      let stripeSubItemId: string | null = null
      let stripeSyncError: string | null = null
      try {
        const { data: subItem } = await supabase
          .from('subscription_items')
          .select('id, stripe_subscription_item_id, status')
          .eq('tenant_id', t.id)
          .eq('module_code', mod.code)
          .maybeSingle()
        if (subItem?.stripe_subscription_item_id && subItem.status === 'active') {
          stripeSubItemId = subItem.stripe_subscription_item_id
          const ok = await stripeUpdateSubscriptionItemQuantity({
            subscriptionItemId: subItem.stripe_subscription_item_id,
            quantity: Math.max(1, entityCount),
          })
          stripeSyncStatus = ok ? 'synced' : 'failed'
          if (!ok) stripeSyncError = 'stripe_update_failed'
        }
      } catch (e) {
        stripeSyncStatus = 'failed'
        stripeSyncError = e instanceof Error ? e.message : 'unknown'
      }

      const { error } = await supabase.from('entity_billing_snapshots').upsert(
        {
          tenant_id: t.id,
          module_code: mod.code,
          period_month: periodMonth,
          entity_count: entityCount,
          unit_price_eur: unit,
          base_price_eur: base,
          total_eur: total,
          stripe_subitem_id: stripeSubItemId,
          stripe_sync_status: stripeSyncStatus,
          stripe_sync_error: stripeSyncError,
        },
        { onConflict: 'tenant_id,module_code,period_month' },
      )
      if (error) {
        console.warn('[cron/billing-snapshots] upsert error:', error.message)
        skipped++
      } else {
        snapshotsCreated++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    period_month: periodMonth,
    snapshots_created: snapshotsCreated,
    skipped,
    tenants_processed: tenants.length,
  })
}
