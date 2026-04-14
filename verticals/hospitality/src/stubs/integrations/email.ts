import { Resend } from 'resend'
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

interface ResendCredentials {
  api_key: string
  from_email: string
  from_name?: string
  reply_to?: string
}

// Risoluzione credenziali: prima per-tenant dal DB, poi fallback piattaforma da env
async function resolveResendConfig(entityId: string): Promise<ResendCredentials | null> {
  const fromDb = (await getDecryptedCredentials(entityId, 'resend')) as ResendCredentials | null
  if (fromDb?.api_key) return fromDb

  const envKey = process.env.RESEND_API_KEY
  const envFrom = process.env.RESEND_FROM_EMAIL ?? 'noreply@touracore.com'
  const envName = process.env.RESEND_FROM_NAME ?? 'TouraCore'
  if (envKey) {
    return { api_key: envKey, from_email: envFrom, from_name: envName }
  }

  return null
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; skipped?: boolean; reason?: string; messageId?: string }> {
  const supabase = await createServerSupabaseClient()

  // Salva in sent_messages prima dell'invio per audit completo
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

  if (insertError || !sentMessage) {
    console.error('[Email] Errore salvataggio sent_message:', insertError?.message)
    return { success: false, reason: insertError?.message ?? 'Errore salvataggio' }
  }

  const config = await resolveResendConfig(params.entityId)
  if (!config) {
    await supabase
      .from('sent_messages')
      .update({ status: 'failed', error_message: 'Credenziali Resend non configurate' })
      .eq('id', sentMessage.id)
    return { success: true, skipped: true, reason: 'Credenziali Resend non configurate' }
  }

  try {
    const resend = new Resend(config.api_key)
    const fromAddress = params.from
      ?? (config.from_name
        ? `${config.from_name} <${config.from_email}>`
        : config.from_email)

    const result = await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: config.reply_to,
    })

    if (result.error) {
      await supabase
        .from('sent_messages')
        .update({ status: 'failed', error_message: result.error.message })
        .eq('id', sentMessage.id)
      return { success: false, reason: result.error.message, messageId: sentMessage.id }
    }

    await supabase
      .from('sent_messages')
      .update({
        status: 'sent',
        external_id: result.data?.id ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq('id', sentMessage.id)

    return { success: true, messageId: sentMessage.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore invio email'
    await supabase
      .from('sent_messages')
      .update({ status: 'failed', error_message: message })
      .eq('id', sentMessage.id)
    return { success: false, reason: message, messageId: sentMessage.id }
  }
}

export { renderTemplate }
