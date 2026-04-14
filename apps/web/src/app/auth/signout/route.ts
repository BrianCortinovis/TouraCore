import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'

// Gestisce logout via POST (chiamato dal form nel topbar)
export async function POST() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()

  // Redirect alla landing page
  const url = new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  return NextResponse.redirect(url, { status: 303 })
}

// GET mostra comunque redirect per sicurezza (non logout via GET per CSRF)
export async function GET() {
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    { status: 303 }
  )
}
