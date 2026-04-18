import type { BikeType, InsuranceTier, RiderExperience } from './types/database'

// =============================================================================
// Bike type metadata (UI display)
// =============================================================================
export const BIKE_TYPE_META: Record<
  BikeType,
  {
    label: string
    icon: string
    isElectric: boolean
    defaultWheelSize: string
    minAge: number
    description: string
  }
> = {
  road: {
    label: 'Bici da strada',
    icon: '🚴',
    isElectric: false,
    defaultWheelSize: '28',
    minAge: 14,
    description: 'Telaio leggero, ideale asfalto e lunghe distanze',
  },
  gravel: {
    label: 'Gravel',
    icon: '🚵',
    isElectric: false,
    defaultWheelSize: '28',
    minAge: 14,
    description: 'Versatile strada e sterrato',
  },
  mtb: {
    label: 'MTB',
    icon: '⛰️',
    isElectric: false,
    defaultWheelSize: '29',
    minAge: 12,
    description: 'Mountain bike, trail e sentieri',
  },
  e_mtb: {
    label: 'E-MTB',
    icon: '⚡',
    isElectric: true,
    defaultWheelSize: '29',
    minAge: 14,
    description: 'MTB elettrica con motore pedalata assistita',
  },
  e_city: {
    label: 'E-City',
    icon: '🔋',
    isElectric: true,
    defaultWheelSize: '28',
    minAge: 14,
    description: 'Bici elettrica urbana con pedalata assistita',
  },
  e_cargo: {
    label: 'E-Cargo',
    icon: '📦',
    isElectric: true,
    defaultWheelSize: '26',
    minAge: 16,
    description: 'Cargo bike elettrica per trasporto merci/bambini',
  },
  e_folding: {
    label: 'E-Folding',
    icon: '💼',
    isElectric: true,
    defaultWheelSize: '20',
    minAge: 14,
    description: 'Bici elettrica pieghevole',
  },
  hybrid: {
    label: 'Ibrida',
    icon: '🚲',
    isElectric: false,
    defaultWheelSize: '28',
    minAge: 12,
    description: 'Versatile city/trekking',
  },
  folding: {
    label: 'Pieghevole',
    icon: '💼',
    isElectric: false,
    defaultWheelSize: '20',
    minAge: 12,
    description: 'Compatta per trasporto su treno',
  },
  kids: {
    label: 'Bambino',
    icon: '🧒',
    isElectric: false,
    defaultWheelSize: '24',
    minAge: 4,
    description: 'Bici per bambini 4-12 anni',
  },
  tandem: {
    label: 'Tandem',
    icon: '👫',
    isElectric: false,
    defaultWheelSize: '28',
    minAge: 14,
    description: 'Bici tandem per due persone',
  },
  handbike: {
    label: 'Handbike',
    icon: '♿',
    isElectric: false,
    defaultWheelSize: '26',
    minAge: 14,
    description: 'Bici a trazione manuale per accessibilità',
  },
  cargo: {
    label: 'Cargo',
    icon: '📦',
    isElectric: false,
    defaultWheelSize: '26',
    minAge: 16,
    description: 'Cargo bike muscolare',
  },
  city: {
    label: 'Città',
    icon: '🏙️',
    isElectric: false,
    defaultWheelSize: '28',
    minAge: 12,
    description: 'Urbana comfort',
  },
}

export const BIKE_TYPES: BikeType[] = Object.keys(BIKE_TYPE_META) as BikeType[]

// =============================================================================
// Addon catalog defaults (per-tenant override via bike_rental_addons table future)
// =============================================================================
export interface AddonDefault {
  key: string
  label: string
  category: 'safety' | 'comfort' | 'navigation' | 'insurance' | 'transport'
  defaultPrice: number
  pricingMode: 'per_rental' | 'per_day' | 'per_hour' | 'per_bike' | 'percent_of_total'
  mandatoryFor?: ('minor' | 'ebike_over_25kmh')[]
  icon: string
}

export const ADDON_DEFAULTS: AddonDefault[] = [
  { key: 'helmet', label: 'Casco', category: 'safety', defaultPrice: 3, pricingMode: 'per_rental', mandatoryFor: ['minor'], icon: '⛑️' },
  { key: 'lock', label: 'Lucchetto', category: 'safety', defaultPrice: 2, pricingMode: 'per_rental', icon: '🔒' },
  { key: 'child_seat', label: 'Seggiolino bambino', category: 'transport', defaultPrice: 5, pricingMode: 'per_day', icon: '🧒' },
  { key: 'gps', label: 'GPS tracker', category: 'navigation', defaultPrice: 4, pricingMode: 'per_day', icon: '📍' },
  { key: 'saddle_bag', label: 'Borsa laterale', category: 'transport', defaultPrice: 3, pricingMode: 'per_rental', icon: '👜' },
  { key: 'repair_kit', label: 'Kit riparazione', category: 'safety', defaultPrice: 2, pricingMode: 'per_rental', icon: '🔧' },
  { key: 'rain_jacket', label: 'Impermeabile', category: 'comfort', defaultPrice: 3, pricingMode: 'per_rental', icon: '🧥' },
  { key: 'map', label: 'Mappa cartacea', category: 'navigation', defaultPrice: 1, pricingMode: 'per_rental', icon: '🗺️' },
  { key: 'hi_vis_vest', label: 'Gilet catarifrangente', category: 'safety', defaultPrice: 1, pricingMode: 'per_rental', icon: '🦺' },
  { key: 'delivery', label: 'Consegna in hotel', category: 'transport', defaultPrice: 10, pricingMode: 'per_rental', icon: '🏨' },
  { key: 'insurance_basic', label: 'Assicurazione Basic', category: 'insurance', defaultPrice: 3, pricingMode: 'per_day', icon: '🛡️' },
  { key: 'insurance_standard', label: 'Assicurazione Standard', category: 'insurance', defaultPrice: 6, pricingMode: 'per_day', icon: '🛡️' },
  { key: 'insurance_premium', label: 'Assicurazione Premium', category: 'insurance', defaultPrice: 10, pricingMode: 'per_day', icon: '🛡️' },
]

// =============================================================================
// Insurance tier metadata
// =============================================================================
export const INSURANCE_TIER_META: Record<
  InsuranceTier,
  { label: string; coverage: string; dailyPrice: number }
> = {
  none: { label: 'Nessuna', coverage: 'Deposito cauzionale copre danni fino a importo', dailyPrice: 0 },
  basic: { label: 'Basic', coverage: 'Copertura furto con denuncia', dailyPrice: 3 },
  standard: { label: 'Standard', coverage: 'Furto + danni accidentali', dailyPrice: 6 },
  premium: { label: 'Premium', coverage: 'Furto + danni + responsabilità civile verso terzi', dailyPrice: 10 },
}

// =============================================================================
// Rider experience helpers
// =============================================================================
export const EXPERIENCE_LABEL: Record<RiderExperience, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Esperto',
  pro: 'Professionista',
}

// =============================================================================
// Duration tiers (hours-based rental slots)
// =============================================================================
export const DURATION_TIERS: { key: string; label: string; hours: number }[] = [
  { key: '1h', label: '1 ora', hours: 1 },
  { key: '2h', label: '2 ore', hours: 2 },
  { key: '4h', label: '4 ore', hours: 4 },
  { key: 'half_day', label: 'Mezza giornata (4h)', hours: 4 },
  { key: 'day', label: 'Giornata (8h)', hours: 8 },
  { key: '24h', label: '24 ore', hours: 24 },
  { key: 'multi_day', label: 'Multi-giorno', hours: 72 },
  { key: 'week', label: 'Settimanale', hours: 168 },
]

// =============================================================================
// Status color helpers (for admin UI)
// =============================================================================
export const BIKE_STATUS_COLOR: Record<string, string> = {
  available: 'green',
  rented: 'blue',
  maintenance: 'yellow',
  damaged: 'red',
  charging: 'cyan',
  retired: 'gray',
  lost: 'red',
}

export const RESERVATION_STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  confirmed: 'blue',
  checked_in: 'cyan',
  active: 'green',
  returned: 'blue',
  cancelled: 'red',
  no_show: 'red',
  late: 'orange',
  completed: 'green',
}

export const DEFAULT_BUFFER_MINUTES = 15
export const DEFAULT_LATE_FEE_PER_HOUR = 10
export const DEFAULT_LATE_FEE_GRACE_MINUTES = 15
export const DEFAULT_CURRENCY = 'EUR'
