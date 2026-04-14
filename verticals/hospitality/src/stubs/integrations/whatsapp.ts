import { getDecryptedCredentials } from './credentials'

export async function sendWhatsAppText(
  entityId: string,
  params: { to: string; body: string; reservationId?: string; guestId?: string }
): Promise<{ success: boolean; messageId?: string; skipped?: boolean; reason?: string }> {
  const creds = await getDecryptedCredentials(entityId, 'whatsapp_business')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali WhatsApp Business non configurate' }
  }

  const phoneNumberId = creds.phone_number_id as string
  const accessToken = creds.access_token as string

  if (!phoneNumberId || !accessToken) {
    return { success: false, reason: 'Credenziali WhatsApp incomplete' }
  }

  // TODO: chiamata HTTP Meta Cloud API per invio messaggio
  // POST https://graph.facebook.com/v18.0/{phoneNumberId}/messages

  return { success: true, skipped: true, reason: 'Client WhatsApp non ancora attivo' }
}
