import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  Reservation,
  Guest,
  Room,
  RoomType,
  RatePlan,
} from '../types/database'

type ReservationWithRelations = Reservation & {
  guest: Guest
  room: Room | null
  room_type: RoomType
  rate_plan: RatePlan | null
}

interface DashboardKPIs {
  totalRevenueMonth: number
  occupancyRate: number
  adr: number
  revpar: number
}

interface RoomStats {
  total: number
  available: number
  occupied: number
  cleaning: number
  maintenance: number
  outOfOrder: number
}

interface OperationalAlert {
  type: 'no_room' | 'unpaid_arriving' | 'housekeeping' | 'tomorrow_arrival'
  title: string
  detail: string
  reservationCode?: string
  urgency: 'info' | 'warning' | 'urgent'
}

interface DashboardData {
  kpis: DashboardKPIs
  todayArrivals: ReservationWithRelations[]
  todayDepartures: ReservationWithRelations[]
  recentReservations: ReservationWithRelations[]
  roomStats: RoomStats
  alerts: OperationalAlert[]
  tomorrowArrivalsCount: number
  pendingHousekeeping: number
}

const RESERVATION_SELECT = `
  *,
  guest:guests(*),
  room:rooms(*, room_type:room_types(*)),
  room_type:room_types(*),
  rate_plan:rate_plans(*)
`

export async function getDashboardData(propIdOverride?: string): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient()
  const propId = propIdOverride ?? (await getCurrentOrg()).property?.id
  if (!propId) {
    return {
      kpis: { totalRevenueMonth: 0, occupancyRate: 0, adr: 0, revpar: 0 },
      todayArrivals: [],
      todayDepartures: [],
      recentReservations: [],
      roomStats: { total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, outOfOrder: 0 },
      alerts: [],
      tomorrowArrivalsCount: 0,
      pendingHousekeeping: 0,
    }
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]!
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]!
  const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]!

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]!
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]!

  const [
    arrivalsResult,
    departuresResult,
    recentResult,
    roomsResult,
    monthRevenueResult,
    monthReservationsResult,
    noRoomResult,
    unpaidResult,
    tomorrowResult,
    housekeepingResult,
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select(RESERVATION_SELECT)
      .eq('entity_id', propId)
      .eq('check_in', today)
      .in('status', ['confirmed', 'option'])
      .order('created_at', { ascending: false }),

    supabase
      .from('reservations')
      .select(RESERVATION_SELECT)
      .eq('entity_id', propId)
      .eq('check_out', today)
      .eq('status', 'checked_in')
      .order('created_at', { ascending: false }),

    supabase
      .from('reservations')
      .select(RESERVATION_SELECT)
      .eq('entity_id', propId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('rooms')
      .select('id, status')
      .eq('entity_id', propId)
      .eq('is_active', true),

    supabase
      .from('reservations')
      .select('total_amount, paid_amount')
      .eq('entity_id', propId)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .lte('check_in', monthEnd)
      .gte('check_out', monthStart),

    supabase
      .from('reservations')
      .select('check_in, check_out, room_id')
      .eq('entity_id', propId)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .not('room_id', 'is', null)
      .lte('check_in', monthEnd)
      .gte('check_out', monthStart),

    supabase
      .from('reservations')
      .select('reservation_code, check_in, guest:guests(first_name, last_name)')
      .eq('entity_id', propId)
      .in('status', ['confirmed', 'option'])
      .is('room_id', null)
      .gte('check_in', today)
      .lte('check_in', nextWeek)
      .order('check_in'),

    supabase
      .from('reservations')
      .select('reservation_code, check_in, total_amount, paid_amount, guest:guests(first_name, last_name)')
      .eq('entity_id', propId)
      .in('status', ['confirmed'])
      .gte('check_in', today)
      .lte('check_in', nextWeek)
      .order('check_in'),

    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', propId)
      .eq('check_in', tomorrow)
      .in('status', ['confirmed', 'option']),

    supabase
      .from('housekeeping_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', propId)
      .eq('task_date', today)
      .in('status', ['pending', 'in_progress']),
  ])

  if (arrivalsResult.error) throw arrivalsResult.error
  if (departuresResult.error) throw departuresResult.error
  if (recentResult.error) throw recentResult.error
  if (roomsResult.error) throw roomsResult.error
  if (monthRevenueResult.error) throw monthRevenueResult.error
  if (monthReservationsResult.error) throw monthReservationsResult.error

  const rooms = roomsResult.data ?? []
  const totalRooms = rooms.length

  const totalRevenueMonth = (monthRevenueResult.data ?? []).reduce(
    (sum, r) => sum + (r.paid_amount ?? 0),
    0
  )

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const totalRoomNightsAvailable = totalRooms * daysInMonth

  let occupiedRoomNights = 0
  for (const res of monthReservationsResult.data ?? []) {
    const ci = new Date(Math.max(new Date(res.check_in).getTime(), new Date(monthStart).getTime()))
    const co = new Date(Math.min(new Date(res.check_out).getTime(), new Date(monthEnd).getTime()))
    const nights = Math.max(0, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)))
    occupiedRoomNights += nights
  }

  const occupancyRate = totalRoomNightsAvailable > 0
    ? Math.round((occupiedRoomNights / totalRoomNightsAvailable) * 10000) / 100
    : 0

  const adr = occupiedRoomNights > 0
    ? Math.round((totalRevenueMonth / occupiedRoomNights) * 100) / 100
    : 0

  const revpar = totalRoomNightsAvailable > 0
    ? Math.round((totalRevenueMonth / totalRoomNightsAvailable) * 100) / 100
    : 0

  const roomStats: RoomStats = {
    total: totalRooms,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
    outOfOrder: rooms.filter((r) => r.status === 'out_of_order').length,
  }

  const alerts: OperationalAlert[] = []

  for (const res of noRoomResult.data ?? []) {
    const guest = res.guest as unknown as { first_name: string; last_name: string } | null
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Ospite'
    alerts.push({
      type: 'no_room',
      title: `${guestName} senza camera assegnata`,
      detail: `Arrivo il ${new Date(res.check_in).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — assegna una camera`,
      reservationCode: res.reservation_code,
      urgency: res.check_in === today ? 'urgent' : 'warning',
    })
  }

  for (const res of unpaidResult.data ?? []) {
    const balance = (res.total_amount ?? 0) - (res.paid_amount ?? 0)
    if (balance <= 0) continue
    const guest = res.guest as unknown as { first_name: string; last_name: string } | null
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Ospite'
    alerts.push({
      type: 'unpaid_arriving',
      title: `Saldo da incassare: ${guestName}`,
      detail: `${balance.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} — arrivo il ${new Date(res.check_in).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
      reservationCode: res.reservation_code,
      urgency: res.check_in === today ? 'urgent' : 'warning',
    })
  }

  const pendingHousekeeping = housekeepingResult.count ?? 0
  if (pendingHousekeeping > 0) {
    alerts.push({
      type: 'housekeeping',
      title: `${pendingHousekeeping} ${pendingHousekeeping === 1 ? 'camera' : 'camere'} da pulire`,
      detail: 'Pulizie in attesa per oggi',
      urgency: 'info',
    })
  }

  const tomorrowArrivalsCount = tomorrowResult.count ?? 0
  if (tomorrowArrivalsCount > 0) {
    alerts.push({
      type: 'tomorrow_arrival',
      title: `${tomorrowArrivalsCount} ${tomorrowArrivalsCount === 1 ? 'arrivo' : 'arrivi'} domani`,
      detail: 'Preparare le camere per domani',
      urgency: 'info',
    })
  }

  const urgencyOrder = { urgent: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return {
    kpis: {
      totalRevenueMonth,
      occupancyRate,
      adr,
      revpar,
    },
    todayArrivals: arrivalsResult.data as ReservationWithRelations[],
    todayDepartures: departuresResult.data as ReservationWithRelations[],
    recentReservations: recentResult.data as ReservationWithRelations[],
    roomStats,
    alerts,
    tomorrowArrivalsCount,
    pendingHousekeeping,
  }
}
