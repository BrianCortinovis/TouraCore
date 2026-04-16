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
        return NextResponse.redirect(new URL('/reset-password', origin))
      }
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Flusso token_hash (recovery via OTP)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash && type === 'recovery') {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })

    if (!error) {
      return NextResponse.redirect(new URL('/reset-password', origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', origin))
}
