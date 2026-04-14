import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  Invoice,
  InvoiceItem,
  Payment,
  PaymentStatus,
  SdiStatus,
} from '../types/database'

interface InvoiceFilters {
  status?: PaymentStatus
  sdiStatus?: SdiStatus
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

type InvoiceWithItems = Invoice & {
  invoice_items: InvoiceItem[]
  payments: Payment[]
}

export async function getInvoices(filters: InvoiceFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { status, sdiStatus, dateFrom, dateTo, search, page = 1, limit = 25 } = filters

  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*), payments(*)', { count: 'exact' })

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  if (status) {
    query = query.eq('payment_status', status)
  }

  if (sdiStatus) {
    query = query.eq('sdi_status', sdiStatus)
  }

  if (dateFrom) {
    query = query.gte('invoice_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('invoice_date', dateTo)
  }

  if (search) {
    query = query.or(
      `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_vat.ilike.%${search}%,customer_fiscal_code.ilike.%${search}%`
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    invoices: data as InvoiceWithItems[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getInvoice(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
      payments(*)
    `)
    .eq('id', id)

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  const { data, error } = await query.single()

  if (error) throw error

  if (data?.invoice_items) {
    data.invoice_items.sort(
      (a: InvoiceItem, b: InvoiceItem) => a.sort_order - b.sort_order
    )
  }

  return data as InvoiceWithItems
}
