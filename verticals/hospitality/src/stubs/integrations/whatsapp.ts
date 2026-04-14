export type WhatsAppConfig = {
  provider?: string
  phone?: string
  apiKey?: string
}

export async function sendWhatsAppText(
  _config: WhatsAppConfig,
  _params: { to: string; body: string },
): Promise<{ success: boolean; messageId?: string; skipped?: boolean }> {
  // Stub: API WhatsApp Business non ancora collegata
  // Le credenziali verranno risolte via resolveIntegration() quando disponibili
  return { success: true, skipped: true }
}
