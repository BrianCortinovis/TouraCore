'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import {
  generateAlloggiatiFile,
  markAlloggiatiSent,
} from '@touracore/hospitality/src/actions/compliance'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadPendingBookingsAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    // Prenotazioni checked_in di oggi senza registrazione Alloggiati
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, guest_name, guest_email, check_in, check_out, status, guest_id, guests(id, first_name, last_name, document_type, document_number, date_of_birth, birth_country, citizenship, birth_place)')
      .eq('entity_id', property.id)
      .eq('check_in', today)
      .in('status', ['checked_in', 'confirmed'])
      .order('guest_name')

    if (error) {
      return { success: false, error: `Errore caricamento: ${error.message}` }
    }

    // Filtra quelli che hanno già una registrazione per oggi
    const bookingIds = (bookings ?? []).map(b => b.id)
    const { data: existing } = await supabase
      .from('police_registrations')
      .select('booking_id')
      .in('booking_id', bookingIds.length > 0 ? bookingIds : ['__none__'])
      .eq('registration_date', today)

    const alreadyRegistered = new Set((existing ?? []).map(r => r.booking_id))
    const pending = (bookings ?? []).filter(b => !alreadyRegistered.has(b.id))

    return { success: true, data: { bookings: pending } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore'
    return { success: false, error: msg }
  }
}

export async function loadRegistrationsAction(date?: string): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const targetDate = date ?? new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('police_registrations')
      .select('*')
      .eq('entity_id', property.id)
      .eq('registration_date', targetDate)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: `Errore caricamento registrazioni: ${error.message}` }
    }

    return { success: true, data: { registrations: data ?? [], date: targetDate } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore'
    return { success: false, error: msg }
  }
}

export async function generateAlloggiatiAction(bookingIds: string[]): Promise<ActionResult> {
  try {
    const result = await generateAlloggiatiFile(bookingIds)
    return {
      success: true,
      data: {
        generated: result.registrations.length,
        skipped: result.skipped,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore generazione'
    return { success: false, error: msg }
  }
}

export async function markSentAction(registrationId: string): Promise<ActionResult> {
  try {
    await markAlloggiatiSent(registrationId)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore'
    return { success: false, error: msg }
  }
}

export async function downloadAlloggiatiFileAction(date?: string): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const targetDate = date ?? new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('police_registrations')
      .select('file_content, is_primary, first_name, last_name')
      .eq('entity_id', property.id)
      .eq('registration_date', targetDate)
      .eq('alloggiati_status', 'generated')

    if (error) {
      return { success: false, error: `Errore: ${error.message}` }
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Nessun record generato per questa data' }
    }

    // Combina i singoli record in un file unico
    const lines = data
      .filter(r => r.file_content)
      .map(r => r.file_content as string)
    const fileContent = lines.join('\r\n') + '\r\n'

    return {
      success: true,
      data: {
        content: fileContent,
        filename: `alloggiati_${targetDate}.txt`,
        count: lines.length,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore download'
    return { success: false, error: msg }
  }
}
