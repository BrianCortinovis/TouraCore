import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createPublicClient } from '@/lib/supabase-public'

export const runtime = 'nodejs'

interface VitalBody {
  name?: string
  value?: number
  rating?: string
  navigationType?: string
  route?: string
  tenant_slug?: string | null
  device_type?: string
  connection_effective_type?: string
}

const SAMPLE_RATE = 0.1 // 10% sampling per non saturare DB

export async function POST(req: NextRequest) {
  // Random sampling at edge
  if (Math.random() > SAMPLE_RATE) {
    return NextResponse.json({ ok: true, sampled_out: true })
  }

  let body: VitalBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!body.name || typeof body.value !== 'number' || !body.route) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const sessionId = req.cookies.get('cwv_sid')?.value ?? randomUUID()
  const ua = req.headers.get('user-agent') ?? ''
  const country = req.headers.get('x-vercel-ip-country') ?? null

  // Simple UA family extraction
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
    maxAge: 60 * 30, // 30min session
    path: '/',
  })
  return res
}
