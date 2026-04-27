import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RECOVERY_COOKIE = '__touracore_pwd_recovery'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(RECOVERY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
