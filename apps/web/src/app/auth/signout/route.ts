import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'

// Logout: POST preferito (CSRF-safe form action). GET fallback per link diretti.
async function handleSignout(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()

  const loginUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(loginUrl, { status: 303 })

  // Forza rimozione cookie Supabase sb-* su tutti path
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
  ]
  for (const name of cookiesToClear) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  }

  // Rimuove anche cookies Supabase con project ref (sb-<ref>-auth-token)
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }

  return response
}

export async function POST(request: NextRequest) {
  return handleSignout(request)
}

export async function GET(request: NextRequest) {
  return handleSignout(request)
}
