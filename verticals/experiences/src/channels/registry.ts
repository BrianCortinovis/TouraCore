// Channel registry per Experience OTA (12 providers 5 tier)
// Pattern replicato da verticals/bike-rental/src/channels/registry.ts
// Adapter impl in M059

export type ExperienceChannelTier = 'S' | 'A' | 'B' | 'C' | 'D'

export interface ExperienceChannel {
  code: string
  label: string
  tier: ExperienceChannelTier
  description: string
  requires_api_key: boolean
  commission_default_pct: number
  website_url: string
}

export const EXPERIENCE_CHANNEL_REGISTRY: ExperienceChannel[] = [
  // Tier S — global OTA
  { code: 'viator', label: 'Viator', tier: 'S', description: 'TripAdvisor Viator marketplace global', requires_api_key: true, commission_default_pct: 25, website_url: 'https://www.viator.com' },
  { code: 'getyourguide', label: 'GetYourGuide', tier: 'S', description: 'GetYourGuide marketplace EU/global', requires_api_key: true, commission_default_pct: 25, website_url: 'https://www.getyourguide.com' },
  { code: 'expedia_local', label: 'Expedia Local Experiences', tier: 'S', description: 'Expedia destination activity', requires_api_key: true, commission_default_pct: 25, website_url: 'https://expedialocalexpert.com' },
  // Tier A
  { code: 'musement', label: 'Musement (TUI)', tier: 'A', description: 'Musement by TUI culture/activity', requires_api_key: true, commission_default_pct: 22, website_url: 'https://www.musement.com' },
  { code: 'tiqets', label: 'Tiqets', tier: 'A', description: 'Tiqets museum/attraction tickets', requires_api_key: true, commission_default_pct: 20, website_url: 'https://www.tiqets.com' },
  { code: 'klook', label: 'Klook', tier: 'A', description: 'Klook APAC+EU marketplace', requires_api_key: true, commission_default_pct: 22, website_url: 'https://www.klook.com' },
  // Tier B
  { code: 'civitatis', label: 'Civitatis', tier: 'B', description: 'Civitatis hispanic-speaking marketplace', requires_api_key: true, commission_default_pct: 20, website_url: 'https://www.civitatis.com' },
  { code: 'headout', label: 'Headout', tier: 'B', description: 'Headout curated experiences', requires_api_key: true, commission_default_pct: 20, website_url: 'https://www.headout.com' },
  // Tier C
  { code: 'regiondo_marketplace', label: 'Regiondo Marketplace', tier: 'C', description: 'Regiondo EU distribution', requires_api_key: true, commission_default_pct: 15, website_url: 'https://www.regiondo.com' },
  { code: 'bokun_b2b', label: 'Bókun B2B', tier: 'C', description: 'Bókun agent B2B network', requires_api_key: true, commission_default_pct: 15, website_url: 'https://www.bokun.io' },
  // Tier D
  { code: 'manual', label: 'Manual/Custom XML', tier: 'D', description: 'Manual booking sync via CSV/XML feed', requires_api_key: false, commission_default_pct: 0, website_url: '' },
  { code: 'zapier', label: 'Zapier Webhook', tier: 'D', description: 'Zapier trigger booking to any endpoint', requires_api_key: false, commission_default_pct: 0, website_url: 'https://zapier.com' },
]

export function getChannelByCode(code: string): ExperienceChannel | undefined {
  return EXPERIENCE_CHANNEL_REGISTRY.find((c) => c.code === code)
}

export function getChannelsByTier(tier: ExperienceChannelTier): ExperienceChannel[] {
  return EXPERIENCE_CHANNEL_REGISTRY.filter((c) => c.tier === tier)
}
