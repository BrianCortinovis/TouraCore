import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase-public'

export const runtime = 'nodejs'

const ConsentSchema = z.object({
  preferences: z.object({
    necessary: z.boolean().optional(),
    analytics: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }),
  org_slug: z.string().max(120).nullish(),
  policy_version: z.string().max(40).optional(),
  reconsent: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null)
  const parsed = ConsentSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })
  }
  const body = parsed.data

  const preferences = {
    necessary: true,
    analytics: !!body.preferences.analytics,
    marketing: !!body.preferences.marketing,
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
  res.cookies.set('cc_sid', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return res
}
