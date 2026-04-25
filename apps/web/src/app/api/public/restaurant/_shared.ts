import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  // Whitelist domini known
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function jsonWithCors(data: unknown, init: ResponseInit & { origin: string | null }) {
  const { origin, ...rest } = init
  return NextResponse.json(data, { ...rest, headers: { ...corsHeaders(origin), ...(rest.headers ?? {}) } })
}

export interface RestaurantContext {
  id: string
  slug: string
  name: string
  cuisine_type: string[]
  price_range: number | null
  capacity_total: number
  avg_turn_minutes: number
  reservation_mode: 'slot' | 'rolling' | 'hybrid'
  opening_hours: Record<string, Array<{ open: string; close: string }>>
  services: Array<{ name: string; start: string; end: string; max_covers?: number }>
  deposit_policy: { enabled?: boolean; amount_per_cover?: number; above_party?: number }
  template?: string
  theme?: Record<string, string>
}

export async function loadRestaurantBySlug(slug: string): Promise<RestaurantContext | null> {
  const admin = await createServiceRoleClient()

  const { data: entity } = await admin
    .from('entities')
    .select('id, slug, name, kind, is_active')
    .eq('slug', slug)
    .eq('kind', 'restaurant')
    .eq('is_active', true)
    .maybeSingle()

  if (!entity) return null

  const { data: r } = await admin
    .from('restaurants')
    .select('cuisine_type, price_range, capacity_total, avg_turn_minutes, reservation_mode, opening_hours, services, deposit_policy, settings')
    .eq('id', entity.id)
    .maybeSingle()

  if (!r) return null

  const settings = (r.settings as Record<string, unknown>) ?? {}

  return {
    id: entity.id as string,
    slug: entity.slug as string,
    name: entity.name as string,
    cuisine_type: (r.cuisine_type as string[]) ?? [],
    price_range: r.price_range as number | null,
    capacity_total: r.capacity_total as number,
    avg_turn_minutes: r.avg_turn_minutes as number,
    reservation_mode: r.reservation_mode as 'slot' | 'rolling' | 'hybrid',
    opening_hours: (r.opening_hours as RestaurantContext['opening_hours']) ?? {},
    services: (r.services as RestaurantContext['services']) ?? [],
    deposit_policy: (r.deposit_policy as RestaurantContext['deposit_policy']) ?? {},
    template: (settings.booking_template as string) ?? 'minimal',
    theme: (settings.booking_theme as Record<string, string>) ?? {},
  }
}
