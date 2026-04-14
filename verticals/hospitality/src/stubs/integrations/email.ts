import { createServerSupabaseClient } from '@touracore/db'
import { getDecryptedCredentials } from './credentials'
import { renderTemplate } from '../email/templates'

interface SendEmailParams {
  entityId: string
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  reservationId?: string
  guestId?: string
  templateId?: string
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; skipped?: boolean; reason?: string; messageId?: string }> {
  const supabase = await createServerSupabaseClient()

  // Salva in sent_messages indipendentemente dall'invio
  const { data: sentMessage, error: insertError } = await supabase
    .from('sent_messages')
    .insert({
      entity_id: params.entityId,
      template_id: params.templateId ?? null,
      reservation_id: params.reservationId ?? null,
      guest_id: params.guestId ?? null,
      channel: 'email',
      recipient: params.to,
      subject: params.subject,
      body: params.html,
      status: 'queued',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[Email] Errore salvataggio sent_message:', insertError.message)
    return { success: false, reason: insertError.message }
  }

  const creds = await getDecryptedCredentials(params.entityId, 'resend')
  if (!creds) {
    // Nessuna credenziale Resend — marca come skipped
    await supabase
      .from('sent_messages')
      .update({ status: 'queued', error_message: 'Credenziali Resend non configurate' })
      .eq('id', sentMessage.id)

    return { success: true, skipped: true, reason: 'Credenziali Resend non configurate' }
  }

  // TODO: collegare client Resend quando API disponibile
  // Per ora marca come queued — verrà processato quando il client è attivo
  return { success: true, skipped: true, reason: 'Client Resend non ancora attivo', messageId: sentMessage.id }
}

export { renderTemplate }
