import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { generateAlloggiatiForDate, type AlloggiatiAutoSendMode } from '@touracore/hospitality/src/actions/compliance'

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
  const today = new Date().toISOString().slice(0, 10)

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, settings')
    .eq('kind', 'accommodation')
    .eq('is_active', true)

  if (!entities || entities.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const results: Array<{
    entity_id: string
    entity_slug: string
    mode: string
    generated: number
    skipped: number
    already_existing: number
    skipped_details?: Array<{ booking_id: string; reason: string }>
  }> = []

  for (const ent of entities) {
    const settings = (ent.settings ?? {}) as { alloggiati_auto_send?: AlloggiatiAutoSendMode }
    const mode = settings.alloggiati_auto_send ?? 'disabled'
    if (mode === 'disabled') continue

    try {
      const r = await generateAlloggiatiForDate(ent.id as string, today, mode)
      results.push({
        entity_id: ent.id as string,
        entity_slug: ent.slug as string,
        mode,
        generated: r.generated,
        skipped: r.skipped.length,
        already_existing: r.already_existing,
        skipped_details: r.skipped.slice(0, 5).map((s) => ({ booking_id: s.booking_id, reason: s.reason })),
      })
    } catch (e) {
      results.push({
        entity_id: ent.id as string,
        entity_slug: ent.slug as string,
        mode,
        generated: 0,
        skipped: 0,
        already_existing: 0,
        skipped_details: [{ booking_id: 'error', reason: e instanceof Error ? e.message : String(e) }],
      })
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    entities_processed: results.length,
    total_generated: results.reduce((s, r) => s + r.generated, 0),
    total_skipped: results.reduce((s, r) => s + r.skipped, 0),
    results,
  })
}
