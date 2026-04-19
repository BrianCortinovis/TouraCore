'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import { collectTouristTax } from '@touracore/hospitality/src/actions/compliance'
import type { PaymentMethod } from '@touracore/hospitality/src/types/database'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadTaxRatesAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('tourist_tax_rates')
      .select('*')
      .eq('entity_id', property.id)
      .order('category')

    if (error) return { success: false, error: error.message }
    return { success: true, data: { rates: data ?? [] } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function saveTaxRateAction(rate: {
  category: string
  rate_per_person: number
  is_exempt: boolean
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('tourist_tax_rates')
      .upsert(
        {
          entity_id: property.id,
          category: rate.category,
          rate_per_person: rate.rate_per_person,
          is_exempt: rate.is_exempt,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'entity_id,category' },
      )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function saveTaxSettingsAction(settings: {
  tourist_tax_enabled: boolean
  tourist_tax_max_nights: number
  tourist_tax_municipality: string
  tourist_tax_payment_policy: 'online_only' | 'onsite_only' | 'guest_choice'
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('accommodations')
      .update({
        tourist_tax_enabled: settings.tourist_tax_enabled,
        tourist_tax_max_nights: settings.tourist_tax_max_nights,
        tourist_tax_municipality: settings.tourist_tax_municipality,
        tourist_tax_payment_policy: settings.tourist_tax_payment_policy,
      })
      .eq('entity_id', property.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function loadTaxSettingsAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('accommodations')
      .select('tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality, tourist_tax_payment_policy')
      .eq('entity_id', property.id)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: { settings: data } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function loadTaxRecordsAction(month: number, year: number): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('tourist_tax_records')
      .select(`
        *,
        booking:reservation_id (guest_name, check_in, check_out),
        guest:guest_id (first_name, last_name)
      `)
      .eq('entity_id', property.id)
      .gte('tax_date', startDate)
      .lt('tax_date', endDate)
      .order('tax_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    const records = data ?? []
    const totalDue = records.reduce((sum, r) => sum + Number(r.total_amount), 0)
    const totalCollected = records
      .filter(r => r.is_collected)
      .reduce((sum, r) => sum + Number(r.total_amount), 0)
    const totalExempt = records.filter(r => r.is_exempt).length
    const totalPending = records.filter(r => !r.is_collected && !r.is_exempt).length

    return {
      success: true,
      data: {
        records,
        summary: {
          total_due: Math.round(totalDue * 100) / 100,
          total_collected: Math.round(totalCollected * 100) / 100,
          total_exempt: totalExempt,
          total_pending: totalPending,
          total_records: records.length,
        },
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function collectTaxAction(
  recordId: string,
  paymentMethod: string,
): Promise<ActionResult> {
  try {
    await collectTouristTax(recordId, paymentMethod as PaymentMethod)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function exportMonthlyReportAction(month: number, year: number): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const { data: records, error } = await supabase
      .from('tourist_tax_records')
      .select(`
        *,
        booking:reservation_id (guest_name, check_in, check_out),
        guest:guest_id (first_name, last_name)
      `)
      .eq('entity_id', property.id)
      .gte('tax_date', startDate)
      .lt('tax_date', endDate)
      .order('tax_date')

    if (error) return { success: false, error: error.message }
    if (!records || records.length === 0) {
      return { success: false, error: 'Nessun record per questo mese' }
    }

    const { data: accommodation } = await supabase
      .from('accommodations')
      .select('tourist_tax_municipality')
      .eq('entity_id', property.id)
      .single()

    const { data: entity } = await supabase
      .from('entities')
      .select('name')
      .eq('id', property.id)
      .single()

    const MONTHS = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
    ]

    const totalDue = records.reduce((s, r) => s + Number(r.total_amount), 0)
    const totalCollected = records.filter(r => r.is_collected).reduce((s, r) => s + Number(r.total_amount), 0)
    const totalExempt = records.filter(r => r.is_exempt).length
    const taxableRecords = records.filter(r => !r.is_exempt)

    const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

    const lines: string[] = [
      `REPORT MENSILE TASSA DI SOGGIORNO`,
      `Struttura: ${entity?.name ?? '—'}`,
      `Comune: ${accommodation?.tourist_tax_municipality ?? '—'}`,
      `Periodo: ${MONTHS[month - 1]} ${year}`,
      '',
      `${'Data'.padEnd(12)}${'Ospite'.padEnd(30)}${'Notti'.padStart(6)}${'Ospiti'.padStart(7)}${'Tariffa'.padStart(10)}${'Totale'.padStart(12)}${'Stato'.padStart(12)}`,
      '-'.repeat(89),
    ]

    for (const r of records) {
      const guestName = r.guest
        ? `${(r.guest as { first_name: string }).first_name} ${(r.guest as { last_name: string }).last_name}`
        : (r.booking as { guest_name: string })?.guest_name ?? '—'
      const status = r.is_exempt ? 'Esente' : r.is_collected ? 'Riscossa' : 'Da riscuotere'

      lines.push(
        `${r.tax_date.padEnd(12)}${guestName.slice(0, 28).padEnd(30)}${String(r.nights).padStart(6)}${String(r.guests_count).padStart(7)}${fmt(Number(r.rate_per_person)).padStart(10)}${fmt(Number(r.total_amount)).padStart(12)}${status.padStart(12)}`,
      )
    }

    lines.push('-'.repeat(89))
    lines.push('')
    lines.push(`Totale dovuto:       ${fmt(totalDue)}`)
    lines.push(`Totale riscosso:     ${fmt(totalCollected)}`)
    lines.push(`Differenza:          ${fmt(totalCollected - totalDue)}`)
    lines.push(`Record tassabili:    ${taxableRecords.length}`)
    lines.push(`Record esenti:       ${totalExempt}`)
    lines.push('')
    lines.push(`Report generato il ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}`)

    return {
      success: true,
      data: {
        content: lines.join('\n'),
        filename: `tassa_soggiorno_${year}_${String(month).padStart(2, '0')}.txt`,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
