import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { sanitizeNextPath } from '@touracore/auth/redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const type = searchParams.get('type')
      if (type === 'recovery') {
        return setRecoverySentinel(NextResponse.redirect(new URL('/reset-password', origin)))
      }
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Flusso token_hash recovery + signup
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash && (type === 'recovery' || type === 'signup' || type === 'invite' || type === 'magiclink' || type === 'email_change')) {
    const supabase = await createServerSupabaseClient()

    // PKCE flow: token_hash inizia con `pkce_`. Va exchanged via exchangeCodeForSession
    if (tokenHash.startsWith('pkce_')) {
      const { error } = await supabase.auth.exchangeCodeForSession(tokenHash)
      if (!error) {
        if (type === 'recovery') {
          return setRecoverySentinel(NextResponse.redirect(new URL('/reset-password', origin)))
        }
        return NextResponse.redirect(new URL(next, origin))
      }
    } else {
      // OTP legacy (non-PKCE)
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email_change',
      })
      if (!error) {
        if (type === 'recovery') {
          return setRecoverySentinel(NextResponse.redirect(new URL('/reset-password', origin)))
        }
        return NextResponse.redirect(new URL(next, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', origin))
}

const RECOVERY_COOKIE = '__touracore_pwd_recovery'
const RECOVERY_TTL_SECONDS = 15 * 60

function setRecoverySentinel(res: NextResponse): NextResponse {
  res.cookies.set(RECOVERY_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: RECOVERY_TTL_SECONDS,
  })
  return res
}
