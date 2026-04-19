import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createPublicClient } from '@/lib/supabase-public'

export const runtime = 'nodejs'

interface Body {
  preferences?: {
    necessary?: boolean
    analytics?: boolean
    marketing?: boolean
  }
  org_slug?: string | null
  policy_version?: string
  reconsent?: boolean
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const prefs = body.preferences
  if (!prefs || typeof prefs !== 'object') {
    return NextResponse.json({ error: 'missing_preferences' }, { status: 400 })
  }

  const preferences = {
    necessary: true,
    analytics: !!prefs.analytics,
    marketing: !!prefs.marketing,
  }

  const sessionId = req.cookies.get('cc_sid')?.value ?? randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = req.headers.get('user-agent') ?? null
  const policyVersion = body.policy_version ?? 'unknown'

  try {
    const supabase = createPublicClient()
    await supabase.from('cookie_consent_records').insert({
      session_id: sessionId,
      tenant_slug: body.org_slug ?? null,
      preferences,
      policy_version: policyVersion,
      is_reconsent: !!body.reconsent,
      ip_address: ip,
      user_agent: ua,
    })
  } catch {
    // Never block user on consent save failure
  }

  const res = NextResponse.json({ ok: true, session_id: sessionId })
  // Persist session id for future consent records
  res.cookies.set('cc_sid', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })
  return res
}
