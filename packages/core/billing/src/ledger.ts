import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommissionEntry, LedgerEntryType, Invoice } from './types'

export async function addLedgerEntry(
  supabase: SupabaseClient,
  entry: {
    tenant_id: string
    reservation_id?: string
    type: LedgerEntryType
    amount: number
    currency?: string
    stripe_payment_intent_id?: string
    stripe_transfer_id?: string
    description?: string
    status?: CommissionEntry['status']
  }
): Promise<CommissionEntry> {
  const { data, error } = await supabase
    .from('commission_ledger')
    .insert({
      tenant_id: entry.tenant_id,
      reservation_id: entry.reservation_id ?? null,
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency ?? 'EUR',
      stripe_payment_intent_id: entry.stripe_payment_intent_id ?? null,
      stripe_transfer_id: entry.stripe_transfer_id ?? null,
      description: entry.description ?? null,
      status: entry.status ?? 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`Errore nel ledger: ${error.message}`)
  return data as CommissionEntry
}

export async function getLedgerEntries(
  supabase: SupabaseClient,
  tenantId: string,
  opts?: { page?: number; perPage?: number; type?: LedgerEntryType }
): Promise<{ data: CommissionEntry[]; count: number }> {
  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20

  let query = supabase
    .from('commission_ledger')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)

  if (opts?.type) query = query.eq('type', opts.type)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as CommissionEntry[], count: count ?? 0 }
}

export async function getInvoices(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Invoice[]
}
