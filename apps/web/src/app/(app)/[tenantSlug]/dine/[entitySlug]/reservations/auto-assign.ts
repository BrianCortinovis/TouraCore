/**
 * Auto-assign tavolo per restaurant_reservation.
 * Strategia: minimize waste seat (seats_max - party_size più piccolo possibile).
 * Considera tavoli liberi nel time range richiesto.
 */

interface TableCandidate {
  id: string
  seats_min: number
  seats_max: number
  active: boolean
  joinable_with: string[]
}

interface ReservationConflict {
  table_ids: string[]
  start: Date
  end: Date
}

export function autoAssignTables(params: {
  tables: TableCandidate[]
  existing: ReservationConflict[]
  partySize: number
  slotDate: string
  slotTime: string
  durationMinutes: number
}): string[] {
  const { tables, existing, partySize, slotDate, slotTime, durationMinutes } = params

  const newStart = new Date(`${slotDate}T${slotTime}`)
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000)

  const occupied = new Set<string>()
  for (const r of existing) {
    if (r.start < newEnd && r.end > newStart) {
      for (const tid of r.table_ids) occupied.add(tid)
    }
  }

  // Single table option, prefer minimize waste
  const candidates = tables
    .filter((t) => t.active && t.seats_max >= partySize && t.seats_min <= partySize && !occupied.has(t.id))
    .sort((a, b) => (a.seats_max - partySize) - (b.seats_max - partySize))

  if (candidates.length > 0 && candidates[0]) return [candidates[0].id]

  // Join tables option: combine joinable_with
  for (const t of tables) {
    if (occupied.has(t.id)) continue
    if (!t.active) continue
    for (const partnerId of t.joinable_with) {
      if (occupied.has(partnerId)) continue
      const partner = tables.find((p) => p.id === partnerId)
      if (!partner || !partner.active) continue
      const combined = t.seats_max + partner.seats_max
      if (combined >= partySize) return [t.id, partner.id]
    }
  }

  return []
}
