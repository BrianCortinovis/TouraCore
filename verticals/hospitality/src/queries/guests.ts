import { createServerSupabaseClient } from '@touracore/db'
import type { Guest } from '../types/database'

interface GuestFilters {
  search?: string
  country?: string
  tags?: string[]
  loyaltyLevel?: string
  page?: number
  limit?: number
}

export type GuestWithBookingCount = Guest & {
  booking_count: number
}

export async function getGuests(filters: GuestFilters = {}, entityId: string) {
  const supabase = await createServerSupabaseClient()
  const { search, country, tags, loyaltyLevel, page = 1, limit = 25 } = filters

  let query = supabase
    .from('guests')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId)

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,fiscal_code.ilike.%${search}%`
    )
  }

  if (country) {
    query = query.eq('country', country)
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  if (loyaltyLevel) {
    query = query.eq('loyalty_level', loyaltyLevel)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(from, to)

  if (error) throw error

  return {
    guests: (data ?? []) as Guest[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getGuest(id: string, entityId: string) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .eq('entity_id', entityId)

  const { data, error } = await query.single()

  if (error) throw error
  return data as Guest
}

export interface GuestStayRecord {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  source: string
  total_amount: number
  currency: string
  notes: string | null
  created_at: string
}

export async function getGuestStayHistory(
  guestId: string,
  entityId: string
): Promise<GuestStayRecord[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('bookings')
    .select('id, guest_name, check_in, check_out, status, source, total_amount, currency, notes, created_at')
    .eq('guest_id', guestId)
    .order('check_in', { ascending: false })
    .limit(50)

  query = query.eq('entity_id', entityId)

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as GuestStayRecord[]
}

export async function getGuestCountries(entityId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('guests')
    .select('country')
    .not('country', 'is', null)
    .order('country')

  query = query.eq('entity_id', entityId)

  const { data, error } = await query

  if (error) throw error
  const unique = [...new Set((data ?? []).map((d) => d.country).filter(Boolean))]
  return unique as string[]
}

export async function getGuestTags(entityId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('guests')
    .select('tags')

  query = query.eq('entity_id', entityId)

  const { data, error } = await query

  if (error) throw error
  const allTags = (data ?? []).flatMap((d) => d.tags ?? [])
  return [...new Set(allTags)].sort()
}
