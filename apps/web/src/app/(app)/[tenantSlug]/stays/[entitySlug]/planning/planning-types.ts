import type { PlanningBooking, PlanningBlock, PlanningRoom } from './actions'

export type PlanningView = 'day' | 'week' | 'month' | 'year'

export interface StatusStyle {
  bg: string
  border: string
  text: string
  label: string
}

export const STATUS_STYLES: Record<PlanningBooking['status'], StatusStyle> = {
  inquiry: {
    bg: '#F3E8FF',
    border: '#A855F7',
    text: '#6B21A8',
    label: 'Richiesta',
  },
  option: {
    bg: '#FEF3C7',
    border: '#F59E0B',
    text: '#92400E',
    label: 'Opzione',
  },
  confirmed: {
    bg: '#DBEAFE',
    border: '#3B82F6',
    text: '#1E3A8A',
    label: 'Confermata',
  },
  checked_in: {
    bg: '#D1FAE5',
    border: '#10B981',
    text: '#065F46',
    label: 'In casa',
  },
  checked_out: {
    bg: '#E5E7EB',
    border: '#6B7280',
    text: '#374151',
    label: 'Partito',
  },
  cancelled: {
    bg: '#FEE2E2',
    border: '#EF4444',
    text: '#991B1B',
    label: 'Cancellata',
  },
  no_show: {
    bg: '#FCE7F3',
    border: '#DB2777',
    text: '#9D174D',
    label: 'No show',
  },
}

export const BLOCK_STYLE = {
  bg: 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 6px, #FACC15 6px, #FACC15 12px)',
  border: '#EAB308',
  text: '#713F12',
  label: 'Manutenzione',
}

export const SOURCE_LABELS: Record<PlanningBooking['source'], string> = {
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

export interface RoomGroup {
  type_id: string
  type_name: string
  rooms: PlanningRoom[]
}

export function groupRoomsByType(rooms: PlanningRoom[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>()
  for (const room of rooms) {
    if (!map.has(room.room_type_id)) {
      map.set(room.room_type_id, {
        type_id: room.room_type_id,
        type_name: room.room_type_name,
        rooms: [],
      })
    }
    map.get(room.room_type_id)!.rooms.push(room)
  }
  return Array.from(map.values())
}

/**
 * Calcola KPI del giorno corrente dalle bookings
 */
export interface PlanningKPI {
  occupancyPct: number
  arrivals: number
  departures: number
  inHouse: number
  available: number
  revenueToday: number
}

export function computeKPIs(
  rooms: PlanningRoom[],
  bookings: PlanningBooking[],
  today: Date
): PlanningKPI {
  const todayIso = toIsoDate(today)
  const totalRooms = rooms.length

  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'no_show' && b.status !== 'checked_out'
  )

  let arrivals = 0
  let departures = 0
  let inHouse = 0
  let revenueToday = 0

  for (const b of activeBookings) {
    if (b.check_in === todayIso) {
      arrivals += 1
      revenueToday += b.total_amount
    }
    if (b.check_out === todayIso) {
      departures += 1
    }
    if (b.check_in <= todayIso && b.check_out > todayIso) {
      inHouse += 1
    }
  }

  const occupancyPct = totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0

  return {
    occupancyPct,
    arrivals,
    departures,
    inHouse,
    available: Math.max(0, totalRooms - inHouse),
    revenueToday,
  }
}

/**
 * Genera array di date tra fromDate e toDate (inclusive)
 */
export function dateRange(from: Date, to: Date): Date[] {
  const result: Date[] = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (current <= end) {
    result.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return result
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function startOfWeek(d: Date): Date {
  // Settimana inizia il lunedì
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  return addDays(start, 6)
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}

export function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31)
}

export function formatMonthYear(d: Date, locale = 'it-IT'): string {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function formatDayMonth(d: Date, locale = 'it-IT'): string {
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

export function isToday(d: Date): boolean {
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

/**
 * Dato una lista di bookings, calcola l'indice (room_id, date) -> booking
 * per lookup rapido nel render grid
 */
export function buildBookingIndex(
  bookings: PlanningBooking[]
): Map<string, PlanningBooking[]> {
  const index = new Map<string, PlanningBooking[]>()
  for (const b of bookings) {
    if (!b.room_id) continue
    const existing = index.get(b.room_id) ?? []
    existing.push(b)
    index.set(b.room_id, existing)
  }
  return index
}

export function buildBlockIndex(
  blocks: PlanningBlock[]
): Map<string, PlanningBlock[]> {
  const index = new Map<string, PlanningBlock[]>()
  for (const b of blocks) {
    const existing = index.get(b.room_id) ?? []
    existing.push(b)
    index.set(b.room_id, existing)
  }
  return index
}
