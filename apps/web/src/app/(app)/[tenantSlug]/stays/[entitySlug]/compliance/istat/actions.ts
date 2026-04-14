'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import { calculateIstatData } from '@touracore/hospitality/src/compliance/istat-c59'
import type { IstatReservation } from '@touracore/hospitality/src/compliance/istat-c59'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadIstatDataAction(month: number, year: number): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('check_in, check_out, guest_name, metadata, status')
      .eq('tenant_id', property.tenant_id ?? property.id)
      .lte('check_in', endDate)
      .gte('check_out', startDate)
      .in('status', ['confirmed', 'completed'])

    if (error) return { success: false, error: error.message }

    const reservations: IstatReservation[] = (bookings ?? []).map((b) => ({
      check_in: b.check_in,
      check_out: b.check_out,
      guest_nationality: (b.metadata as Record<string, unknown>)?.nationality as string ?? 'IT',
      guest_province: (b.metadata as Record<string, unknown>)?.province as string ?? null,
      adults: ((b.metadata as Record<string, unknown>)?.adults as number) ?? 1,
      children: ((b.metadata as Record<string, unknown>)?.children as number) ?? 0,
      status: b.status,
    }))

    const istatData = calculateIstatData(reservations, month, year)

    return { success: true, data: { istat: istatData, reservationCount: reservations.length } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
