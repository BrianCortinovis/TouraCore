import type { BikeChannelProvider } from './types'

/**
 * Catalog of supported channel managers + OTA providers for bike rentals.
 * Metadata used for admin UI provider picker + documentation.
 */
export interface BikeChannelProviderMeta {
  provider: BikeChannelProvider
  label: string
  tier: 'hub' | 'direct_ota' | 'bike_pure' | 'standard' | 'long_tail'
  scope: 'EU' | 'global' | 'DACH_IT' | 'APAC' | 'US' | 'IT'
  description: string
  commissionRange: string
  integrationMode: 'push_pull' | 'webhook' | 'polling' | 'passive'
  docsUrl?: string
  credentialFields: Array<{ key: string; label: string; type: 'text' | 'password'; required: boolean }>
}

export const BIKE_CHANNEL_REGISTRY: Record<BikeChannelProvider, BikeChannelProviderMeta> = {
  // Tier 1: hub middleware (priorità MVP)
  bokun: {
    provider: 'bokun',
    label: 'Bókun (TripAdvisor)',
    tier: 'hub',
    scope: 'global',
    description: '70+ OTA inclusi GYG/Viator/Musement/Tiqets via un solo hub',
    commissionRange: '10-20%',
    integrationMode: 'webhook',
    docsUrl: 'https://docs.bokun.io/en/articles/326-channel-manager-api',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
  rezdy: {
    provider: 'rezdy',
    label: 'Rezdy',
    tier: 'hub',
    scope: 'APAC',
    description: '100+ OTA activity, supplier-hosted API',
    commissionRange: '15-25%',
    integrationMode: 'webhook',
    docsUrl: 'https://developers.rezdy.com/rezdyconnect/index.html',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
    ],
  },
  regiondo: {
    provider: 'regiondo',
    label: 'Regiondo',
    tier: 'hub',
    scope: 'DACH_IT',
    description: 'Channel manager DACH + Italia, GYG/Viator/Musement',
    commissionRange: '12-20%',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
    ],
  },
  checkfront: {
    provider: 'checkfront',
    label: 'Checkfront',
    tier: 'hub',
    scope: 'global',
    description: 'Booking + channel manager con OTA addon',
    commissionRange: '10-15%',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // Tier 2: direct OTA (alto ROI EU)
  getyourguide: {
    provider: 'getyourguide',
    label: 'GetYourGuide',
    tier: 'direct_ota',
    scope: 'EU',
    description: 'EU leader, Italia top per activity+rental',
    commissionRange: '25-35%',
    integrationMode: 'webhook',
    docsUrl: 'https://supply.getyourguide.support/',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
    ],
  },
  viator: {
    provider: 'viator',
    label: 'Viator (TripAdvisor)',
    tier: 'direct_ota',
    scope: 'global',
    description: 'TripAdvisor ecosystem, tour + rental',
    commissionRange: '25-50%',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  fareharbor: {
    provider: 'fareharbor',
    label: 'FareHarbor',
    tier: 'direct_ota',
    scope: 'US',
    description: 'Booking.com Experiences gate (FHDN)',
    commissionRange: '15-25%',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // Tier 3: bike-specific OTA
  bikesbooking: {
    provider: 'bikesbooking',
    label: 'Bikesbooking.com (Papaya)',
    tier: 'bike_pure',
    scope: 'global',
    description: 'Largest bike-pure OTA',
    commissionRange: '15-25%',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  listnride: {
    provider: 'listnride',
    label: 'ListNRide',
    tier: 'bike_pure',
    scope: 'EU',
    description: 'EU bike marketplace, 40+ paesi',
    commissionRange: 'commission-based',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  komoot: {
    provider: 'komoot',
    label: 'Komoot Partner',
    tier: 'bike_pure',
    scope: 'EU',
    description: 'Route library + rental cross-sell',
    commissionRange: 'partnership fee',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  bikemap: {
    provider: 'bikemap',
    label: 'BikeMap Partner',
    tier: 'bike_pure',
    scope: 'EU',
    description: 'Route platform con rental booking',
    commissionRange: 'TBD',
    integrationMode: 'push_pull',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // Tier 4: OCTO standard (future-proof)
  octo_ventrata: {
    provider: 'octo_ventrata',
    label: 'Ventrata (OCTO)',
    tier: 'standard',
    scope: 'global',
    description: 'OCTO standard implementation, enterprise resellers',
    commissionRange: '12-18%',
    integrationMode: 'push_pull',
    docsUrl: 'https://docs.octo.travel',
    credentialFields: [
      { key: 'apiKey', label: 'OCTO Bearer Token', type: 'password', required: true },
    ],
  },

  // Tier 5: long-tail via hub
  civitatis: {
    provider: 'civitatis',
    label: 'Civitatis',
    tier: 'long_tail',
    scope: 'EU',
    description: 'Spain-led EU activity OTA (via Bokun bridge)',
    commissionRange: '20-30%',
    integrationMode: 'passive',
    credentialFields: [
      { key: 'supplierId', label: 'Supplier ID (via hub)', type: 'text', required: true },
    ],
  },
  klook: {
    provider: 'klook',
    label: 'Klook',
    tier: 'long_tail',
    scope: 'APAC',
    description: 'APAC activity OTA',
    commissionRange: '20-30%',
    integrationMode: 'passive',
    credentialFields: [
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
    ],
  },
  musement: {
    provider: 'musement',
    label: 'Musement',
    tier: 'long_tail',
    scope: 'IT',
    description: 'Italy-native activity OTA (via hub)',
    commissionRange: '20-30%',
    integrationMode: 'passive',
    credentialFields: [
      { key: 'supplierId', label: 'Supplier ID (via hub)', type: 'text', required: true },
    ],
  },
  tiqets: {
    provider: 'tiqets',
    label: 'Tiqets',
    tier: 'long_tail',
    scope: 'EU',
    description: 'EU activity OTA via hub',
    commissionRange: '20-25%',
    integrationMode: 'passive',
    credentialFields: [
      { key: 'supplierId', label: 'Supplier ID (via hub)', type: 'text', required: true },
    ],
  },
  headout: {
    provider: 'headout',
    label: 'Headout',
    tier: 'long_tail',
    scope: 'global',
    description: 'Activity aggregator',
    commissionRange: '20-30%',
    integrationMode: 'passive',
    credentialFields: [
      { key: 'supplierId', label: 'Supplier ID (via hub)', type: 'text', required: true },
    ],
  },
}

export function getProviderMeta(provider: BikeChannelProvider): BikeChannelProviderMeta {
  return BIKE_CHANNEL_REGISTRY[provider]
}

export const TIER_LABEL: Record<BikeChannelProviderMeta['tier'], string> = {
  hub: 'Hub middleware',
  direct_ota: 'OTA diretti',
  bike_pure: 'Bike-pure OTA',
  standard: 'Standard OCTO',
  long_tail: 'Long-tail via hub',
}
