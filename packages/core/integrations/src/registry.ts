import { z } from 'zod'
import type { IntegrationProvider, IntegrationProviderDef, IntegrationScope } from './types'

// Schema di validazione per input credenziali
export const integrationCredentialsSchema = z.object({
  scope: z.enum(['tenant', 'agency', 'entity']),
  scope_id: z.string().uuid(),
  provider: z.enum([
    'octorate',
    'resend',
    'whatsapp_business',
    'stripe_connect',
    'booking_ical',
    'airbnb_ical',
  ]),
  credentials: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()).optional(),
})

// Registro provider con campi form, validazione e label italiane
const PROVIDER_REGISTRY: Record<IntegrationProvider, IntegrationProviderDef> = {
  octorate: {
    provider: 'octorate',
    label: 'Octorate',
    description: 'Channel Manager per Booking.com, Expedia, Airbnb e altri canali OTA',
    icon: 'Globe',
    allowedScopes: ['tenant', 'agency', 'entity'],
    fields: [
      { key: 'api_key', label: 'Chiave API', type: 'password', required: true, help: 'La trovi nel pannello Octorate → Impostazioni → API' },
      { key: 'account_id', label: 'ID Account', type: 'text', required: true, placeholder: 'es. 12345' },
      { key: 'property_mapping', label: 'Mappatura strutture', type: 'jsonb', required: false, help: 'JSON con mapping entity_id → octorate_property_id' },
    ],
  },
  resend: {
    provider: 'resend',
    label: 'Resend',
    description: 'Servizio invio email transazionali e marketing',
    icon: 'Mail',
    allowedScopes: ['tenant', 'agency'],
    fields: [
      { key: 'api_key', label: 'Chiave API', type: 'password', required: true },
      { key: 'from_email', label: 'Email mittente', type: 'email', required: true, placeholder: 'noreply@tuodominio.it' },
      { key: 'from_name', label: 'Nome mittente', type: 'text', required: true, placeholder: 'La Tua Struttura' },
      { key: 'reply_to', label: 'Rispondi a', type: 'email', required: false, placeholder: 'info@tuodominio.it' },
    ],
  },
  whatsapp_business: {
    provider: 'whatsapp_business',
    label: 'WhatsApp Business',
    description: 'Messaggi WhatsApp automatici per conferme e comunicazioni ospiti',
    icon: 'MessageCircle',
    allowedScopes: ['tenant'],
    fields: [
      { key: 'phone_number_id', label: 'ID Numero Telefono', type: 'text', required: true },
      { key: 'access_token', label: 'Token di accesso', type: 'password', required: true },
      { key: 'business_account_id', label: 'ID Account Business', type: 'text', required: true },
    ],
  },
  stripe_connect: {
    provider: 'stripe_connect',
    label: 'Stripe Connect',
    description: 'Pagamenti online e gestione incassi',
    icon: 'CreditCard',
    allowedScopes: ['tenant', 'agency'],
    fields: [
      { key: 'account_id', label: 'ID Account Stripe', type: 'text', required: true, placeholder: 'acct_...' },
      { key: 'webhook_secret', label: 'Segreto Webhook', type: 'password', required: true, placeholder: 'whsec_...' },
    ],
  },
  booking_ical: {
    provider: 'booking_ical',
    label: 'Booking.com (iCal)',
    description: 'Sincronizzazione calendario via iCal con Booking.com',
    icon: 'Calendar',
    allowedScopes: ['entity'],
    fields: [
      { key: 'ical_url_in', label: 'URL iCal importazione', type: 'url', required: false, placeholder: 'https://admin.booking.com/...' },
      { key: 'ical_url_out', label: 'URL iCal esportazione', type: 'url', required: false, placeholder: 'URL generato automaticamente' },
    ],
  },
  airbnb_ical: {
    provider: 'airbnb_ical',
    label: 'Airbnb (iCal)',
    description: 'Sincronizzazione calendario via iCal con Airbnb',
    icon: 'Home',
    allowedScopes: ['entity'],
    fields: [
      { key: 'ical_url_in', label: 'URL iCal importazione', type: 'url', required: false, placeholder: 'https://www.airbnb.com/calendar/ical/...' },
      { key: 'ical_url_out', label: 'URL iCal esportazione', type: 'url', required: false, placeholder: 'URL generato automaticamente' },
    ],
  },
}

export function getProviderDef(provider: IntegrationProvider): IntegrationProviderDef {
  return PROVIDER_REGISTRY[provider]
}

export function getProvidersForScope(scope: IntegrationScope): IntegrationProviderDef[] {
  return Object.values(PROVIDER_REGISTRY).filter((def) =>
    def.allowedScopes.includes(scope),
  )
}

export function getAllProviders(): IntegrationProviderDef[] {
  return Object.values(PROVIDER_REGISTRY)
}
