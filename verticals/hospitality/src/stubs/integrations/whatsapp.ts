import { createServerSupabaseClient } from '@touracore/db'
import { getDecryptedCredentials } from './credentials'

export async function sendWhatsAppText(
  entityId: string,
  params: { to: string; body: string; reservationId?: string; guestId?: string }
): Promise<{ success: boolean; messageId?: string; skipped?: boolean; reason?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: sentMessage, error: insertError } = await supabase
    .from('sent_messages')
    .insert({
      entity_id: entityId,
      template_id: null,
      reservation_id: params.reservationId ?? null,
      guest_id: params.guestId ?? null,
      channel: 'whatsapp',
      recipient: params.to,
      subject: null,
      body: params.body,
      status: 'queued',
      metadata: {},
    })
    .select('id')
    .single()

  if (insertError || !sentMessage) {
    return { success: false, reason: insertError?.message ?? 'Errore creazione messaggio WhatsApp' }
  }

  const creds = await getDecryptedCredentials(entityId, 'whatsapp_business')
  if (!creds) {
    await supabase
      .from('sent_messages')
      .update({
        status: 'failed',
        error_message: 'Credenziali WhatsApp Business non configurate',
      })
      .eq('id', sentMessage.id)

    return { success: true, skipped: true, reason: 'Credenziali WhatsApp Business non configurate' }
  }

  const phoneNumberId = creds.phone_number_id as string
  const accessToken = creds.access_token as string

  if (!phoneNumberId || !accessToken) {
    await supabase
      .from('sent_messages')
      .update({
        status: 'failed',
        error_message: 'Credenziali WhatsApp incomplete',
      })
      .eq('id', sentMessage.id)

    return { success: false, reason: 'Credenziali WhatsApp incomplete' }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'text',
        text: { body: params.body },
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }>; error?: { message?: string } }
      | null

    if (!response.ok) {
      const message = payload?.error?.message ?? `WhatsApp API error ${response.status}`
      await supabase
        .from('sent_messages')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', sentMessage.id)

      return { success: false, reason: message, messageId: sentMessage.id }
    }

    const externalId = payload?.messages?.[0]?.id ?? null

    await supabase
      .from('sent_messages')
      .update({
        status: 'sent',
        external_id: externalId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', sentMessage.id)

    return { success: true, messageId: sentMessage.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore invio WhatsApp'
    await supabase
      .from('sent_messages')
      .update({
        status: 'failed',
        error_message: message,
      })
      .eq('id', sentMessage.id)

    return { success: false, reason: message, messageId: sentMessage.id }
  }
}
