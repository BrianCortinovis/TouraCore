import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const now = new Date().toISOString()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, modules, billing_grace_until, slug')
    .not('billing_grace_until', 'is', null)
    .lt('billing_grace_until', now)

  if (!tenants) return NextResponse.json({ ok: true, disabled: 0 })

  let disabledCount = 0
  for (const t of tenants) {
    const modules = (t.modules ?? {}) as Record<string, { active: boolean; source: string }>
    const updated: typeof modules = {}
    for (const [code, state] of Object.entries(modules)) {
      updated[code] = { ...state, active: false, source: 'grace_expired' }
    }
    await supabase.from('tenants').update({ modules: updated }).eq('id', t.id)
    await supabase.from('module_activation_log').insert({
      tenant_id: t.id,
      module_code: 'all',
      action: 'grace_expired_disabled',
      actor_scope: 'system',
      notes: `Grace period expired at ${t.billing_grace_until}`,
    })
    disabledCount++
  }

  return NextResponse.json({ ok: true, disabled: disabledCount, tenants_processed: tenants.length })
}
