import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase-public'

export const runtime = 'nodejs'

const Schema = z.object({
  event_name: z.string().min(1).max(100),
  event_category: z.enum(['page_view', 'booking_funnel', 'conversion', 'engagement', 'technical', 'error']),
  event_value: z.number().nullable().optional(),
  event_currency: z.string().max(3).nullable().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  tenant_slug: z.string().max(100).nullable().optional(),
  entity_slug: z.string().max(100).nullable().optional(),
  page_path: z.string().max(500).nullable().optional(),
  utm_source: z.string().max(100).nullable().optional(),
  utm_medium: z.string().max(100).nullable().optional(),
  utm_campaign: z.string().max(100).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  session_id: z.string().max(100).nullable().optional(),
  device_type: z.enum(['desktop', 'mobile', 'tablet']).nullable().optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY', issues: parsed.error.issues }, { status: 400 })
  }

  const supabase = createPublicClient()
  const country = req.headers.get('x-vercel-ip-country') ?? null

  const { error } = await supabase.from('analytics_events').insert({
    ...parsed.data,
    properties: parsed.data.properties ?? {},
    country_code: country,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
