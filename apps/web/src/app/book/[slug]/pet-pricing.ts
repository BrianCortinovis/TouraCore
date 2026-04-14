// Helper di calcolo pet pricing — NON è un file server action,
// quindi qui posso esportare funzioni sincrone e tipi.

export interface PublicPetPolicy {
  allowed: boolean
  max_pets: number
  fee_per_night: number
  fee_per_stay: number
  notes: string
}

// Calcola supplemento totale pet secondo la policy:
// (per_night * pet_count * nights) + (per_stay * pet_count)
export function calculatePetSupplement(
  policy: PublicPetPolicy,
  petCount: number,
  nights: number,
): number {
  if (!policy.allowed || petCount <= 0) return 0
  const perNight = policy.fee_per_night * petCount * nights
  const perStay = policy.fee_per_stay * petCount
  return Math.round((perNight + perStay) * 100) / 100
}
