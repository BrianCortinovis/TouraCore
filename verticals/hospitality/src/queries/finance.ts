import { createServerSupabaseClient } from '@touracore/db'
import type {
  ReservationFinancial,
  FinancialSummary,
  ChannelFinancialBreakdown,
  MonthlyFinancialSummary,
  ChannelCommission,
  BookingSource,
} from '../types/database'

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

interface FinanceFilters {
  dateFrom?: string
  dateTo?: string
  source?: BookingSource
  page?: number
  limit?: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getReservationFinancials(propId: string, filters: FinanceFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { dateFrom, dateTo, source, page = 1, limit = 25 } = filters

  let query = supabase
    .from('v_reservation_financials')
    .select('*', { count: 'exact' })
    .eq('entity_id', propId)

  if (source) query = query.eq('source', source)
  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('check_in', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    financials: (data ?? []) as ReservationFinancial[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getFinancialSummary(propId: string, dateFrom?: string, dateTo?: string): Promise<FinancialSummary> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('gross_amount, commission_amount, tourist_tax_amount, cedolare_secca_amount, iva_amount, ritenuta_ota_amount, net_income, paid_amount, balance')
    .eq('entity_id', propId)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as Pick<ReservationFinancial, 'gross_amount' | 'commission_amount' | 'tourist_tax_amount' | 'cedolare_secca_amount' | 'iva_amount' | 'ritenuta_ota_amount' | 'net_income' | 'paid_amount' | 'balance'>[]

  return {
    total_gross: rows.reduce((s, r) => s + Number(r.gross_amount), 0),
    total_commissions: rows.reduce((s, r) => s + Number(r.commission_amount), 0),
    total_tourist_tax: rows.reduce((s, r) => s + Number(r.tourist_tax_amount), 0),
    total_cedolare_secca: rows.reduce((s, r) => s + Number(r.cedolare_secca_amount), 0),
    total_iva: rows.reduce((s, r) => s + Number(r.iva_amount), 0),
    total_ritenuta_ota: rows.reduce((s, r) => s + Number(r.ritenuta_ota_amount), 0),
    total_net_income: rows.reduce((s, r) => s + Number(r.net_income), 0),
    total_paid: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
    total_balance: rows.reduce((s, r) => s + Number(r.balance), 0),
    reservation_count: rows.length,
  }
}

export async function getChannelBreakdown(propId: string, dateFrom?: string, dateTo?: string): Promise<ChannelFinancialBreakdown[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('source, gross_amount, commission_amount, commission_rate')
    .eq('entity_id', propId)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  const channelMap = new Map<string, { gross: number; commission: number; count: number; rateSum: number }>()
  for (const row of data ?? []) {
    const existing = channelMap.get(row.source) ?? { gross: 0, commission: 0, count: 0, rateSum: 0 }
    existing.gross += Number(row.gross_amount)
    existing.commission += Number(row.commission_amount)
    existing.count += 1
    existing.rateSum += Number(row.commission_rate)
    channelMap.set(row.source, existing)
  }

  return Array.from(channelMap.entries())
    .map(([channel, d]) => ({
      channel: channel as BookingSource,
      gross_amount: d.gross,
      commission_amount: d.commission,
      reservation_count: d.count,
      avg_commission_rate: d.count > 0 ? d.rateSum / d.count : 0,
    }))
    .sort((a, b) => b.gross_amount - a.gross_amount)
}

export async function getMonthlyFinancials(propId: string, dateFrom?: string, dateTo?: string): Promise<MonthlyFinancialSummary[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('check_in, gross_amount, commission_amount, tourist_tax_amount, cedolare_secca_amount, iva_amount, ritenuta_ota_amount, net_income')
    .eq('entity_id', propId)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  const monthMap = new Map<string, MonthlyFinancialSummary>()
  for (const row of data ?? []) {
    const month = row.check_in.substring(0, 7)
    const existing = monthMap.get(month) ?? {
      month,
      gross_amount: 0,
      commission_amount: 0,
      tourist_tax_amount: 0,
      cedolare_secca_amount: 0,
      iva_amount: 0,
      ritenuta_ota_amount: 0,
      net_income: 0,
      reservation_count: 0,
    }
    existing.gross_amount += Number(row.gross_amount)
    existing.commission_amount += Number(row.commission_amount)
    existing.tourist_tax_amount += Number(row.tourist_tax_amount)
    existing.cedolare_secca_amount += Number(row.cedolare_secca_amount)
    existing.iva_amount += Number(row.iva_amount)
    existing.ritenuta_ota_amount += Number(row.ritenuta_ota_amount)
    existing.net_income += Number(row.net_income)
    existing.reservation_count += 1
    monthMap.set(month, existing)
  }

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export async function getChannelCommissions(propId: string): Promise<ChannelCommission[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('channel_commissions')
    .select('*')
    .eq('entity_id', propId)
    .order('channel')

  if (error) throw error
  return (data ?? []) as ChannelCommission[]
}

// ---------------------------------------------------------------------------
// OTA Revenue Analysis
// ---------------------------------------------------------------------------

export interface DirectVsOtaComparison {
  direct_gross: number
  direct_net: number
  direct_count: number
  ota_gross: number
  ota_net: number
  ota_commissions: number
  ota_count: number
  direct_percentage: number
}

export async function getDirectVsOtaComparison(
  propId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<DirectVsOtaComparison> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('is_direct, gross_amount, net_income, commission_amount')
    .eq('entity_id', propId)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  let directGross = 0, directNet = 0, directCount = 0
  let otaGross = 0, otaNet = 0, otaCommissions = 0, otaCount = 0

  for (const row of data ?? []) {
    if (row.is_direct) {
      directGross += Number(row.gross_amount)
      directNet += Number(row.net_income)
      directCount++
    } else {
      otaGross += Number(row.gross_amount)
      otaNet += Number(row.net_income)
      otaCommissions += Number(row.commission_amount)
      otaCount++
    }
  }

  const totalGross = directGross + otaGross

  return {
    direct_gross: directGross,
    direct_net: directNet,
    direct_count: directCount,
    ota_gross: otaGross,
    ota_net: otaNet,
    ota_commissions: otaCommissions,
    ota_count: otaCount,
    direct_percentage: totalGross > 0 ? Math.round((directGross / totalGross) * 100) : 0,
  }
}

export interface OtaPaymentBreakdown {
  ota_payment_type: string
  count: number
  gross_amount: number
  effective_receivable: number
}

export async function getOtaPaymentTypeBreakdown(
  propId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<OtaPaymentBreakdown[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('ota_payment_type, gross_amount, effective_receivable')
    .eq('entity_id', propId)
    .eq('is_direct', false)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  const typeMap = new Map<string, { count: number; gross: number; receivable: number }>()
  for (const row of data ?? []) {
    const type = row.ota_payment_type || 'non_specificato'
    const existing = typeMap.get(type) ?? { count: 0, gross: 0, receivable: 0 }
    existing.count++
    existing.gross += Number(row.gross_amount)
    existing.receivable += Number(row.effective_receivable)
    typeMap.set(type, existing)
  }

  return Array.from(typeMap.entries())
    .map(([type, d]) => ({
      ota_payment_type: type,
      count: d.count,
      gross_amount: d.gross,
      effective_receivable: d.receivable,
    }))
    .sort((a, b) => b.gross_amount - a.gross_amount)
}

export interface ChannelRevenueDetail {
  channel_name: string
  source: BookingSource
  count: number
  gross_amount: number
  commission_amount: number
  net_amount: number
  avg_commission_rate: number
}

export async function getChannelRevenueDetails(
  propId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ChannelRevenueDetail[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_reservation_financials')
    .select('source, channel_name, gross_amount, commission_amount, commission_rate, net_income')
    .eq('entity_id', propId)

  if (dateFrom) query = query.gte('check_in', dateFrom)
  if (dateTo) query = query.lte('check_in', dateTo)

  const { data, error } = await query
  if (error) throw error

  const channelMap = new Map<string, { source: BookingSource; count: number; gross: number; commission: number; net: number; rateSum: number }>()

  for (const row of data ?? []) {
    const key = row.channel_name || row.source
    const existing = channelMap.get(key) ?? { source: row.source as BookingSource, count: 0, gross: 0, commission: 0, net: 0, rateSum: 0 }
    existing.count++
    existing.gross += Number(row.gross_amount)
    existing.commission += Number(row.commission_amount)
    existing.net += Number(row.net_income)
    existing.rateSum += Number(row.commission_rate)
    channelMap.set(key, existing)
  }

  return Array.from(channelMap.entries())
    .map(([name, d]) => ({
      channel_name: name,
      source: d.source,
      count: d.count,
      gross_amount: d.gross,
      commission_amount: d.commission,
      net_amount: d.net,
      avg_commission_rate: d.count > 0 ? d.rateSum / d.count : 0,
    }))
    .sort((a, b) => b.gross_amount - a.gross_amount)
}
