export const ACCESS_TYPE_LABELS: Record<string, string> = {
  keybox: 'Cassetta chiavi',
  smart_lock: 'Serratura smart',
  code_panel: 'Tastierino codice',
  key_handoff: 'Consegna chiavi',
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  sent: 'Inviato',
  signed: 'Firmato',
  active: 'Attivo',
  completed: 'Completato',
  cancelled: 'Annullato',
}

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  collected: 'Incassata',
  partially_returned: 'Parzialmente restituita',
  returned: 'Restituita',
  forfeited: 'Trattenuta',
}

export const MEAL_PLAN_LABELS: Record<string, string> = {
  room_only: 'Solo pernottamento',
  breakfast: 'Pernottamento e colazione',
  half_board: 'Mezza pensione',
  full_board: 'Pensione completa',
  all_inclusive: 'All inclusive',
}

export const BOOKING_SOURCE_LABELS: Record<string, string> = {
  direct: 'Diretto',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  phone: 'Telefono',
  walk_in: 'Walk-in',
  website: 'Sito web',
  email: 'Email',
  agency: 'Agenzia',
  other: 'Altro',
}

export const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Cane',
  cat: 'Gatto',
  other: 'Altro',
}

export const PET_SIZE_LABELS: Record<string, string> = {
  small: 'Piccolo (< 10kg)',
  medium: 'Medio (10-25kg)',
  large: 'Grande (> 25kg)',
}

export const RATE_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  non_refundable: 'Non rimborsabile',
  package: 'Pacchetto',
  long_stay: 'Soggiorno lungo',
  early_booking: 'Prenota prima',
  last_minute: 'Last minute',
}
