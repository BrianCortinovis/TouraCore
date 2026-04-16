import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { sanitizeNextPath } from '@touracore/auth/redirect'

function loginRedirect(
  request: NextRequest,
  error: 'missing_credentials' | 'invalid_credentials' | 'email_not_confirmed' | 'auth_error',
  nextPath: string
) {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', error)
  url.searchParams.set('next', nextPath)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const nextPath = sanitizeNextPath(String(formData.get('next') ?? '/'), '/')

  if (!email || !password) {
    return loginRedirect(request, 'missing_credentials', nextPath)
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const normalizedMessage = error.message.toLowerCase()

    if (normalizedMessage.includes('email not confirmed')) {
      return loginRedirect(request, 'email_not_confirmed', nextPath)
    }

    if (
      normalizedMessage.includes('invalid login credentials') ||
      normalizedMessage.includes('invalid credentials') ||
      normalizedMessage.includes('wrong password')
    ) {
      return loginRedirect(request, 'invalid_credentials', nextPath)
    }

    return loginRedirect(request, 'auth_error', nextPath)
  }

  const redirectUrl = new URL(nextPath, request.url)
  return NextResponse.redirect(redirectUrl, { status: 303 })
}
