import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase-public'

export const runtime = 'nodejs'

const VitalSchema = z.object({
  name: z.string().min(1).max(40),
  value: z.number().finite().min(0).max(60_000),
  rating: z.string().max(20).optional(),
  navigationType: z.string().max(40).optional(),
  route: z.string().min(1).max(500),
  tenant_slug: z.string().max(120).nullish(),
  device_type: z.string().max(40).optional(),
  connection_effective_type: z.string().max(20).optional(),
})

const SAMPLE_RATE = 0.1

export async function POST(req: NextRequest) {
  if (Math.random() > SAMPLE_RATE) {
    return NextResponse.json({ ok: true, sampled_out: true })
  }

  const raw = await req.json().catch(() => null)
  const parsed = VitalSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })
  }
  const body = parsed.data

  const sessionId = req.cookies.get('cwv_sid')?.value ?? randomUUID()
  const ua = req.headers.get('user-agent') ?? ''
  const country = req.headers.get('x-vercel-ip-country') ?? null

  let uaFamily = 'other'
  if (/chrome/i.test(ua)) uaFamily = 'chrome'
  else if (/firefox/i.test(ua)) uaFamily = 'firefox'
  else if (/safari/i.test(ua)) uaFamily = 'safari'
  else if (/edge/i.test(ua)) uaFamily = 'edge'

  try {
    const supabase = createPublicClient()
    await supabase.from('core_web_vitals').insert({
      session_id: sessionId,
      tenant_slug: body.tenant_slug ?? null,
      route: body.route.slice(0, 500),
      metric_name: body.name,
      metric_value: body.value,
      rating: body.rating ?? null,
      navigation_type: body.navigationType ?? null,
      user_agent_family: uaFamily,
      device_type: body.device_type ?? null,
      country_code: country,
      connection_effective_type: body.connection_effective_type ?? null,
    })
  } catch {
    // Never block client on RUM failure
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cwv_sid', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 30,
    path: '/',
  })
  return res
}
