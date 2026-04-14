'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import type { PaymentMethod, InvoiceType, PaymentStatus } from '@touracore/hospitality/src/types/database'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadInvoicesAction(filters?: {
  status?: string
  from_date?: string
  to_date?: string
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('entity_id', property.id)
      .order('invoice_date', { ascending: false })

    if (filters?.status) query = query.eq('payment_status', filters.status)
    if (filters?.from_date) query = query.gte('invoice_date', filters.from_date)
    if (filters?.to_date) query = query.lte('invoice_date', filters.to_date)

    const { data, error } = await query.limit(100)

    if (error) return { success: false, error: error.message }

    const totals = (data ?? []).reduce(
      (acc, inv) => {
        acc.total += Number(inv.total)
        if (inv.payment_status === 'paid') acc.paid += Number(inv.total)
        if (inv.payment_status === 'pending' || inv.payment_status === 'overdue') acc.unpaid += Number(inv.total)
        return acc
      },
      { total: 0, paid: 0, unpaid: 0 },
    )

    return { success: true, data: { invoices: data ?? [], totals } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function createInvoiceAction(input: {
  invoice_type: string
  customer_name: string
  customer_vat?: string
  customer_fiscal_code?: string
  customer_address?: string
  customer_city?: string
  customer_province?: string
  customer_zip?: string
  customer_sdi_code?: string
  customer_pec?: string
  reservation_id?: string
  guest_id?: string
  due_date?: string
  payment_method?: string
  notes?: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    vat_rate: number
  }>
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: invNumber, error: numErr } = await supabase.rpc(
      'generate_invoice_number',
      { p_entity_id: property.id },
    )

    if (numErr) return { success: false, error: `Errore numerazione: ${numErr.message}` }

    const items = input.items.map((item, i) => {
      const vatAmount = Math.round(item.unit_price * item.quantity * (item.vat_rate / 100) * 100) / 100
      const total = Math.round((item.unit_price * item.quantity + vatAmount) * 100) / 100
      return { ...item, vat_amount: vatAmount, total, sort_order: i }
    })

    const subtotal = items.reduce((s, item) => s + item.unit_price * item.quantity, 0)
    const totalVat = items.reduce((s, item) => s + item.vat_amount, 0)
    const total = items.reduce((s, item) => s + item.total, 0)

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        entity_id: property.id,
        invoice_type: input.invoice_type as InvoiceType,
        invoice_number: invNumber as string,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: input.due_date ?? null,
        customer_name: input.customer_name,
        customer_vat: input.customer_vat ?? null,
        customer_fiscal_code: input.customer_fiscal_code ?? null,
        customer_address: input.customer_address ?? null,
        customer_city: input.customer_city ?? null,
        customer_province: input.customer_province ?? null,
        customer_zip: input.customer_zip ?? null,
        customer_sdi_code: input.customer_sdi_code ?? null,
        customer_pec: input.customer_pec ?? null,
        reservation_id: input.reservation_id ?? null,
        guest_id: input.guest_id ?? null,
        subtotal: Math.round(subtotal * 100) / 100,
        total_vat: Math.round(totalVat * 100) / 100,
        total: Math.round(total * 100) / 100,
        payment_method: (input.payment_method as PaymentMethod) ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (invErr) return { success: false, error: invErr.message }

    if (items.length > 0) {
      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
          total: item.total,
          sort_order: item.sort_order,
        })))

      if (itemsErr) return { success: false, error: `Fattura creata ma errore righe: ${itemsErr.message}` }
    }

    return { success: true, data: { invoice } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function markInvoicePaidAction(
  invoiceId: string,
  paymentMethod: string,
): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('total, guest_id, reservation_id')
      .eq('id', invoiceId)
      .eq('entity_id', property.id)
      .single()

    if (fetchErr) return { success: false, error: fetchErr.message }

    await supabase
      .from('invoices')
      .update({
        payment_status: 'paid' as PaymentStatus,
        payment_method: paymentMethod as PaymentMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    await supabase.from('payments').insert({
      entity_id: property.id,
      invoice_id: invoiceId,
      reservation_id: invoice.reservation_id,
      guest_id: invoice.guest_id,
      amount: invoice.total,
      currency: 'EUR',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod as PaymentMethod,
      description: `Pagamento fattura`,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function createInvoiceFromBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .select('*, guest:guests(first_name, last_name, email, phone, fiscal_code, vat_number, address, city, province, zip_code)')
      .eq('id', bookingId)
      .eq('entity_id', property.id)
      .single()

    if (bookErr || !booking) return { success: false, error: 'Prenotazione non trovata' }

    const guest = booking.guest as unknown as {
      first_name: string; last_name: string; fiscal_code?: string; vat_number?: string
      address?: string; city?: string; province?: string; zip_code?: string
    } | null

    const nights = Math.max(1, Math.ceil(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000,
    ))

    return createInvoiceAction({
      invoice_type: 'invoice',
      customer_name: booking.guest_name,
      customer_fiscal_code: guest?.fiscal_code ?? undefined,
      customer_vat: guest?.vat_number ?? undefined,
      customer_address: guest?.address ?? undefined,
      customer_city: guest?.city ?? undefined,
      customer_province: guest?.province ?? undefined,
      customer_zip: guest?.zip_code ?? undefined,
      reservation_id: bookingId,
      guest_id: booking.guest_id ?? undefined,
      items: [{
        description: `Soggiorno ${booking.check_in} - ${booking.check_out} (${nights} notti)`,
        quantity: 1,
        unit_price: Number(booking.total_amount),
        vat_rate: 10,
      }],
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
