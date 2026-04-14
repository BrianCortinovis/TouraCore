import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { Quote, QuoteStatus, Guest, Property } from '../types/database'

interface QuoteFilters {
  status?: QuoteStatus
  search?: string
  page?: number
  limit?: number
}

export type QuoteWithGuest = Quote & {
  guest: Guest | null
}

export type QuoteWithProperty = Quote & {
  property: Property | null
}

export async function getQuotes(filters: QuoteFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { status, search, page = 1, limit = 25 } = filters

  let query = supabase
    .from('quotes')
    .select('*, guest:guests(*)', { count: 'exact' })

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `quote_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    quotes: data as QuoteWithGuest[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getQuoteById(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('quotes')
    .select('*, guest:guests(*)')
    .eq('id', id)

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  const { data, error } = await query.single()

  if (error) throw error
  return data as QuoteWithGuest
}

export async function getQuoteByToken(token: string) {
  const supabase = await createServiceRoleClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*, property:properties(id, name, logo_url, email, phone, address, city, province, zip, primary_color, secondary_color)')
    .eq('token', token)
    .single()

  if (error) throw error
  return data as QuoteWithProperty
}
