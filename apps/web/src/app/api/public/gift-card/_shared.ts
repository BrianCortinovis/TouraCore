import { NextResponse } from 'next/server'

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const allowed = (process.env.PUBLIC_BOOKING_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (baseUrl && origin === baseUrl) return true
  return allowed.includes(origin)
}

export function corsHeaders(origin: string | null): HeadersInit {
  const safeOrigin = isAllowedOrigin(origin) ? origin! : 'null'
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function jsonWithCors(
  data: unknown,
  init: ResponseInit & { origin: string | null },
) {
  const { origin, ...rest } = init
  return NextResponse.json(data, {
    ...rest,
    headers: { ...corsHeaders(origin), ...(rest.headers ?? {}) },
  })
}
