import { createServerSupabaseClient } from '@touracore/db'
import type {
  CreditInstrumentRow,
  CreditTransactionRow,
  CreditKind,
  CreditStatus,
  GiftCardDesignRow,
} from '../types'

export interface ListCreditsFilters {
  tenantId: string
  kind?: CreditKind | CreditKind[]
  status?: CreditStatus | CreditStatus[]
  partnerId?: string
  recipientEmail?: string
  search?: string // code_last4 or recipient_name or sender_name
  expiringBeforeDays?: number
  limit?: number
  offset?: number
}

export async function listCredits(
  filters: ListCreditsFilters,
): Promise<{ rows: CreditInstrumentRow[]; total: number }> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('credit_instruments')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId)
    .order('created_at', { ascending: false })

  if (filters.kind) {
    if (Array.isArray(filters.kind)) q = q.in('kind', filters.kind)
    else q = q.eq('kind', filters.kind)
  }
  if (filters.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status)
    else q = q.eq('status', filters.status)
  }
  if (filters.partnerId) q = q.eq('partner_id', filters.partnerId)
  if (filters.recipientEmail) q = q.eq('recipient_email', filters.recipientEmail.toLowerCase())
  if (filters.search) {
    q = q.or(
      `code_last4.ilike.%${filters.search.toUpperCase()}%,recipient_name.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,recipient_email.ilike.%${filters.search.toLowerCase()}%`,
    )
  }
  if (filters.expiringBeforeDays !== undefined) {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + filters.expiringBeforeDays)
    q = q.lte('expires_at', deadline.toISOString()).gte('expires_at', new Date().toISOString())
  }

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  q = q.range(offset, offset + limit - 1)

  const { data, count } = await q
  return {
    rows: (data as CreditInstrumentRow[] | null) ?? [],
    total: count ?? 0,
  }
}

export async function getCreditById(params: {
  id: string
  tenantId: string
}): Promise<CreditInstrumentRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('credit_instruments')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()
  return (data as CreditInstrumentRow | null) ?? null
}

export async function listCreditTransactions(params: {
  creditInstrumentId: string
  tenantId: string
  limit?: number
}): Promise<CreditTransactionRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('credit_instrument_id', params.creditInstrumentId)
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 100)
  return (data as CreditTransactionRow[] | null) ?? []
}

export interface CreditStats {
  byKind: Record<CreditKind, { count: number; liabilityOutstanding: number; lifetimeIssued: number; redeemed: number }>
  totalLiability: number
  totalRedeemed: number
  expiringWithin30d: number
  totalActive: number
}

export async function getCreditStats(params: { tenantId: string }): Promise<CreditStats> {
  const supabase = await createServerSupabaseClient()
  const { data: instruments } = await supabase
    .from('credit_instruments')
    .select('kind, status, current_balance, initial_amount, expires_at')
    .eq('tenant_id', params.tenantId)

  const stats: CreditStats = {
    byKind: {
      gift_card: { count: 0, liabilityOutstanding: 0, lifetimeIssued: 0, redeemed: 0 },
      voucher: { count: 0, liabilityOutstanding: 0, lifetimeIssued: 0, redeemed: 0 },
      promo_code: { count: 0, liabilityOutstanding: 0, lifetimeIssued: 0, redeemed: 0 },
      store_credit: { count: 0, liabilityOutstanding: 0, lifetimeIssued: 0, redeemed: 0 },
    },
    totalLiability: 0,
    totalRedeemed: 0,
    expiringWithin30d: 0,
    totalActive: 0,
  }

  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const now = new Date()

  for (const ci of instruments ?? []) {
    const bucket = stats.byKind[ci.kind as CreditKind]
    if (!bucket) continue
    bucket.count++
    const balance = Number(ci.current_balance)
    const initial = Number(ci.initial_amount)
    bucket.lifetimeIssued += initial
    if (ci.status === 'active') {
      bucket.liabilityOutstanding += balance
      stats.totalActive++
      if (ci.expires_at && new Date(ci.expires_at) <= in30 && new Date(ci.expires_at) > now) {
        stats.expiringWithin30d++
      }
    }
    const consumed = initial - balance
    if (consumed > 0) bucket.redeemed += consumed
  }

  for (const k of Object.keys(stats.byKind) as CreditKind[]) {
    stats.totalLiability += stats.byKind[k].liabilityOutstanding
    stats.totalRedeemed += stats.byKind[k].redeemed
  }

  return stats
}

export async function listGiftCardDesigns(params: {
  tenantId: string
  includeSystem?: boolean
}): Promise<GiftCardDesignRow[]> {
  const supabase = await createServerSupabaseClient()
  const NIL = '00000000-0000-0000-0000-000000000000'
  let q = supabase.from('gift_card_designs').select('*')
  if (params.includeSystem !== false) {
    q = q.or(`tenant_id.eq.${params.tenantId},tenant_id.eq.${NIL}`)
  } else {
    q = q.eq('tenant_id', params.tenantId)
  }
  q = q.order('is_system', { ascending: false }).order('name', { ascending: true })
  const { data } = await q
  return (data as GiftCardDesignRow[] | null) ?? []
}
