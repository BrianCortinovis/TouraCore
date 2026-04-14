// ---------------------------------------------------------------------------
// Upselling — categorie servizi extra e tipi
// ---------------------------------------------------------------------------

import type { PropertyType } from './property-types'

export type UpsellCategory =
  | 'food_beverage'
  | 'transfer'
  | 'experience'
  | 'spa_wellness'
  | 'early_checkin'
  | 'late_checkout'
  | 'parking'
  | 'linen'
  | 'laundry'
  | 'kitchen'
  | 'bike'
  | 'baby_kit'
  | 'pet_kit'
  | 'room_upgrade'
  | 'pool_access'
  | 'gym_access'
  | 'cooking_class'
  | 'guided_tour'
  | 'water_sports'
  | 'other'

export type ChargeMode = 'free' | 'paid'

export type PricingMode =
  | 'per_stay'
  | 'per_night'
  | 'per_guest'
  | 'per_item'
  | 'per_hour'
  | 'per_day'

export type UpsellOrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type UpsellOrderSource = 'guest_portal' | 'reception' | 'email' | 'whatsapp'

export interface UpsellCategoryMeta {
  key: UpsellCategory
  label: string
  icon: string
}

export const UPSELL_CATEGORIES: UpsellCategoryMeta[] = [
  { key: 'food_beverage', label: 'Ristorazione', icon: 'UtensilsCrossed' },
  { key: 'transfer', label: 'Transfer', icon: 'Car' },
  { key: 'experience', label: 'Esperienze', icon: 'Map' },
  { key: 'spa_wellness', label: 'Spa & Wellness', icon: 'Flower2' },
  { key: 'pool_access', label: 'Accesso piscina', icon: 'Waves' },
  { key: 'gym_access', label: 'Accesso palestra', icon: 'Dumbbell' },
  { key: 'cooking_class', label: 'Corso di cucina', icon: 'ChefHat' },
  { key: 'guided_tour', label: 'Tour guidato', icon: 'MapPinned' },
  { key: 'water_sports', label: 'Sport acquatici', icon: 'Sailboat' },
  { key: 'early_checkin', label: 'Early check-in', icon: 'LogIn' },
  { key: 'late_checkout', label: 'Late check-out', icon: 'LogOut' },
  { key: 'parking', label: 'Parcheggio', icon: 'ParkingCircle' },
  { key: 'linen', label: 'Biancheria', icon: 'Shirt' },
  { key: 'laundry', label: 'Lavanderia', icon: 'WashingMachine' },
  { key: 'kitchen', label: 'Cucina', icon: 'CookingPot' },
  { key: 'bike', label: 'Biciclette', icon: 'Bike' },
  { key: 'baby_kit', label: 'Kit bambini', icon: 'Baby' },
  { key: 'pet_kit', label: 'Kit animali', icon: 'PawPrint' },
  { key: 'room_upgrade', label: 'Upgrade camera', icon: 'Sparkles' },
  { key: 'other', label: 'Altro', icon: 'Package' },
]

export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  per_stay: 'Per soggiorno',
  per_night: 'Per notte',
  per_guest: 'Per ospite',
  per_item: 'Per unità',
  per_hour: 'Per ora',
  per_day: 'Per giorno',
}

export const ORDER_STATUS_LABELS: Record<UpsellOrderStatus, string> = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  cancelled: 'Annullato',
  completed: 'Completato',
}

export const ORDER_SOURCE_LABELS: Record<UpsellOrderSource, string> = {
  guest_portal: 'Portale ospite',
  reception: 'Ricevimento',
  email: 'Email',
  whatsapp: 'WhatsApp',
}

export function getUpsellCategoryLabel(category: UpsellCategory): string {
  return UPSELL_CATEGORIES.find((c) => c.key === category)?.label ?? category
}

// ---------------------------------------------------------------------------
// Filtri categorie per property type
// ---------------------------------------------------------------------------

/**
 * Ritorna le categorie upselling rilevanti per un dato tipo di struttura.
 * - Hotel/residence/mixed/affittacamere: tutte
 * - Casa vacanze (apartment): niente room_upgrade, enfasi su self-service
 * - Agriturismo: niente room_upgrade, enfasi su esperienze
 * - B&B: nessuna lavanderia/linen complessa
 */
export function getRelevantUpsellCategories(propertyType: PropertyType): UpsellCategory[] {
  const all = UPSELL_CATEGORIES.map((c) => c.key)

  switch (propertyType) {
    case 'apartment':
      // Casa vacanze: self-service, no room_upgrade (unico alloggio)
      return all.filter((c) => c !== 'room_upgrade')

    case 'agriturismo':
      // Agriturismo: no room_upgrade, enfasi su esperienze/food_beverage
      return all.filter((c) => c !== 'room_upgrade')

    case 'b_and_b':
      // B&B: niente palestra/upgrade camere multiple
      return all.filter((c) => c !== 'gym_access' && c !== 'room_upgrade')

    case 'hotel':
    case 'residence':
    case 'mixed':
    case 'affittacamere':
    default:
      return all
  }
}

// ---------------------------------------------------------------------------
// Trigger comunicazioni per property type
// ---------------------------------------------------------------------------

export type CommunicationTrigger =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'pre_arrival'
  | 'check_in'
  | 'check_out'
  | 'post_stay'
  | 'birthday'
  | 'manual'
  | 'quote_sent'
  | 'payment_reminder'
  | 'check_in_completed'
  | 'restaurant_reservation'
  | 'spa_booking'
  | 'self_checkin_link'
  | 'guidebook'
  | 'departure_instructions'

const COMMON_TRIGGERS: CommunicationTrigger[] = [
  'booking_confirmed',
  'booking_cancelled',
  'pre_arrival',
  'check_in',
  'check_out',
  'post_stay',
  'birthday',
  'manual',
  'quote_sent',
  'payment_reminder',
]

/**
 * Ritorna i trigger di comunicazione rilevanti per un tipo di struttura.
 * - Hotel/residence/agriturismo: include restaurant_reservation, spa_booking, check_in_completed
 * - Apartment/b_and_b: include self_checkin_link, guidebook, departure_instructions
 */
export function getRelevantTriggers(propertyType: PropertyType): CommunicationTrigger[] {
  switch (propertyType) {
    case 'hotel':
    case 'residence':
    case 'mixed':
    case 'affittacamere':
      return [
        ...COMMON_TRIGGERS,
        'check_in_completed',
        'restaurant_reservation',
        'spa_booking',
      ]

    case 'agriturismo':
      return [
        ...COMMON_TRIGGERS,
        'check_in_completed',
        'restaurant_reservation',
      ]

    case 'apartment':
    case 'b_and_b':
      return [
        ...COMMON_TRIGGERS,
        'self_checkin_link',
        'guidebook',
        'departure_instructions',
      ]

    default:
      return COMMON_TRIGGERS
  }
}
