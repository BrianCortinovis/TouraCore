import { createServerSupabaseClient } from '@touracore/db'
import { getTemplatesByTrigger, renderFullTemplate } from '../email/templates'
import { sendEmail } from '../integrations/email'

type AutomationTrigger =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'pre_arrival'
  | 'check_in'
  | 'check_out'
  | 'post_stay'

interface TriggerContext {
  organizationId: string
  reservationId: string
}

export async function fireAutomationTrigger(
  trigger: AutomationTrigger | string,
  context: TriggerContext
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()

    // Carica dati prenotazione con guest e entity
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        guest:guests(first_name, last_name, email, phone),
        room:rooms(room_number, name),
        entity:entities(name)
      `)
      .eq('id', context.reservationId)
      .single()

    if (resError || !reservation) {
      console.error('[Automation] Prenotazione non trovata:', context.reservationId)
      return
    }

    const guest = reservation.guest as Record<string, unknown> | null
    const room = reservation.room as Record<string, unknown> | null
    const entity = reservation.entity as Record<string, unknown> | null

    if (!guest?.email) return

    // Cerca template attivi per questo trigger
    const templates = await getTemplatesByTrigger(
      reservation.entity_id as string,
      trigger
    )

    if (templates.length === 0) return

    // Prepara variabili per sostituzione
    const variables: Record<string, string> = {
      guest_name: `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim(),
      guest_first_name: (guest.first_name as string) ?? '',
      guest_last_name: (guest.last_name as string) ?? '',
      guest_email: (guest.email as string) ?? '',
      guest_phone: (guest.phone as string) ?? '',
      reservation_code: (reservation.reservation_code as string) ?? '',
      check_in: (reservation.check_in as string) ?? '',
      check_out: (reservation.check_out as string) ?? '',
      room_number: (room?.room_number as string) ?? '',
      room_name: (room?.name as string) ?? '',
      total_amount: String(reservation.total_amount ?? 0),
      currency: (reservation.currency as string) ?? 'EUR',
      structure_name: (entity?.name as string) ?? '',
    }

    for (const template of templates) {
      // Evita duplicati: controlla se esiste già un messaggio per questa combinazione
      const { count: existing } = await supabase
        .from('sent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', template.id)
        .eq('reservation_id', context.reservationId)

      if (existing && existing > 0) continue

      const rendered = renderFullTemplate(template, variables)

      if (template.channel === 'email') {
        await sendEmail({
          entityId: reservation.entity_id as string,
          to: guest.email as string,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          reservationId: context.reservationId,
          guestId: reservation.guest_id as string,
          templateId: template.id,
        })
      } else if (template.channel === 'whatsapp') {
        // Salva come queued per WhatsApp — verrà processato quando il client è attivo
        await supabase.from('sent_messages').insert({
          entity_id: reservation.entity_id,
          template_id: template.id,
          reservation_id: context.reservationId,
          guest_id: reservation.guest_id,
          channel: 'whatsapp',
          recipient: (guest.phone as string) ?? '',
          subject: rendered.subject,
          body: rendered.text || rendered.html,
          status: 'queued',
        })
      }
    }
  } catch (err) {
    console.error('[Automation] Errore trigger:', trigger, err)
  }
}

export async function processPendingAutomations(entityId: string): Promise<{
  processed: number
  errors: number
}> {
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]!

  // Pre-arrival: reservations con check_in fra send_days_offset giorni
  const triggerConfigs: Array<{ trigger: string; statusFilter: string[]; dateField: string }> = [
    { trigger: 'pre_arrival', statusFilter: ['confirmed', 'option'], dateField: 'check_in' },
    { trigger: 'post_stay', statusFilter: ['checked_out'], dateField: 'check_out' },
  ]

  let processed = 0
  let errors = 0

  for (const config of triggerConfigs) {
    const templates = await getTemplatesByTrigger(entityId, config.trigger)

    for (const template of templates) {
      // Calcola la data target in base all'offset
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + template.send_days_offset)
      const targetDateStr = targetDate.toISOString().split('T')[0]!

      const { data: matchingReservations } = await supabase
        .from('reservations')
        .select('id, entity_id, guest_id')
        .eq('entity_id', entityId)
        .eq(config.dateField, targetDateStr)
        .in('status', config.statusFilter)

      for (const res of matchingReservations ?? []) {
        try {
          await fireAutomationTrigger(config.trigger, {
            organizationId: entityId,
            reservationId: res.id,
          })
          processed++
        } catch {
          errors++
        }
      }
    }
  }

  return { processed, errors }
}
