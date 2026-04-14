// ---------------------------------------------------------------------------
// Upselling — categorie servizi extra e tipi
// ---------------------------------------------------------------------------

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
  { key: 'early_checkin', label: 'Early check-in', icon: 'LogIn' },
  { key: 'late_checkout', label: 'Late check-out', icon: 'LogOut' },
  { key: 'parking', label: 'Parcheggio', icon: 'ParkingCircle' },
  { key: 'linen', label: 'Biancheria', icon: 'Shirt' },
  { key: 'laundry', label: 'Lavanderia', icon: 'WashingMachine' },
  { key: 'kitchen', label: 'Cucina', icon: 'ChefHat' },
  { key: 'bike', label: 'Biciclette', icon: 'Bike' },
  { key: 'baby_kit', label: 'Kit bambini', icon: 'Baby' },
  { key: 'pet_kit', label: 'Kit animali', icon: 'PawPrint' },
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
