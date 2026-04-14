import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'

// --- Monthly Revenue ---

interface MonthlyRevenueRow {
  month: string
  revenue: number
  rooms: number
  fb: number
}

export async function getMonthlyRevenue(year: number): Promise<MonthlyRevenueRow[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  const startDate = `${year - 1}-03-01`
  const endDate = `${year}-02-28`

  let query = supabase
    .from('reservations')
    .select('check_in, total_amount')
    .gte('check_in', startDate)
    .lte('check_in', endDate)
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error

  const months = new Map<string, { revenue: number; rooms: number; fb: number }>()

  const monthLabels = [
    'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago',
    'Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb',
  ]

  for (let i = 0; i < 12; i++) {
    const monthIdx = (i + 2) % 12
    const y = monthIdx < 2 ? year : year - 1
    const key = `${y}-${String(monthIdx + 1).padStart(2, '0')}`
    months.set(key, { revenue: 0, rooms: 0, fb: 0 })
  }

  for (const reservation of data ?? []) {
    const date = new Date(reservation.check_in)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const entry = months.get(key)
    if (entry) {
      const amount = reservation.total_amount ?? 0
      entry.revenue += amount
      entry.rooms += amount
    }
  }

  const result: MonthlyRevenueRow[] = []
  let i = 0
  for (const [, value] of months) {
    const y = i < 10 ? year - 1 : year
    result.push({
      month: `${monthLabels[i]!} ${y}`,
      revenue: Math.round(value.revenue * 100) / 100,
      rooms: Math.round(value.rooms * 100) / 100,
      fb: Math.round(value.fb * 100) / 100,
    })
    i++
  }

  return result
}

// --- Monthly Occupancy ---

interface MonthlyOccupancyRow {
  month: string
  occupancy: number
}

export async function getMonthlyOccupancy(year: number): Promise<MonthlyOccupancyRow[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let roomQuery = supabase.from('rooms').select('id', { count: 'exact' })
  if (propId) roomQuery = roomQuery.eq('entity_id', propId)
  const { count: totalRooms } = await roomQuery

  const roomCount = totalRooms ?? 1

  const startDate = `${year - 1}-03-01`
  const endDate = `${year}-02-28`

  let query = supabase
    .from('reservations')
    .select('check_in, check_out')
    .gte('check_in', startDate)
    .lte('check_in', endDate)
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error

  const monthLabels = [
    'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago',
    'Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb',
  ]

  const nightsPerMonth = new Map<string, number>()
  const daysPerMonth = new Map<string, number>()

  for (let i = 0; i < 12; i++) {
    const monthIdx = (i + 2) % 12
    const y = monthIdx < 2 ? year : year - 1
    const key = `${y}-${String(monthIdx + 1).padStart(2, '0')}`
    nightsPerMonth.set(key, 0)
    const daysInMonth = new Date(y, monthIdx + 1, 0).getDate()
    daysPerMonth.set(key, daysInMonth)
  }

  for (const reservation of data ?? []) {
    const checkIn = new Date(reservation.check_in)
    const checkOut = new Date(reservation.check_out)
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    const key = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}`
    const current = nightsPerMonth.get(key) ?? 0
    nightsPerMonth.set(key, current + nights)
  }

  const result: MonthlyOccupancyRow[] = []
  let i = 0
  for (const [key, nights] of nightsPerMonth) {
    const days = daysPerMonth.get(key) ?? 30
    const totalRoomNights = roomCount * days
    const occupancy = totalRoomNights > 0 ? Math.min(100, Math.round((nights / totalRoomNights) * 1000) / 10) : 0
    const y = i < 10 ? year - 1 : year
    result.push({
      month: `${monthLabels[i]!} ${y}`,
      occupancy,
    })
    i++
  }

  return result
}

// --- Revenue by Source ---

interface RevenueBySourceRow {
  name: string
  value: number
  percentage: number
}

export async function getRevenueBySource(): Promise<RevenueBySourceRow[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('reservations')
    .select('source, total_amount')
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error

  const sourceMap = new Map<string, number>()
  let totalRevenue = 0

  const sourceLabels: Record<string, string> = {
    direct: 'Diretto',
    booking_com: 'Booking.com',
    expedia: 'Expedia',
    airbnb: 'Airbnb',
    google: 'Google',
    tripadvisor: 'TripAdvisor',
    other: 'Altro',
    phone: 'Telefono',
    email: 'Email',
    walk_in: 'Walk-in',
    website: 'Sito web',
  }

  for (const reservation of data ?? []) {
    const source = reservation.source ?? 'other'
    const amount = reservation.total_amount ?? 0
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + amount)
    totalRevenue += amount
  }

  const result: RevenueBySourceRow[] = []
  for (const [source, value] of sourceMap) {
    result.push({
      name: sourceLabels[source] ?? source,
      value: Math.round(value * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0,
    })
  }

  return result.sort((a, b) => b.value - a.value)
}

// --- Revenue by Room Type ---

interface RevenueByRoomTypeRow {
  type: string
  revenue: number
  rooms_sold: number
}

export async function getRevenueByRoomType(): Promise<RevenueByRoomTypeRow[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('reservations')
    .select('total_amount, room_type:room_types(name)')
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error

  const typeMap = new Map<string, { revenue: number; count: number }>()

  for (const reservation of data ?? []) {
    const roomType = (reservation.room_type as unknown as { name: string } | null)?.name ?? 'Altro'
    const amount = reservation.total_amount ?? 0
    const entry = typeMap.get(roomType) ?? { revenue: 0, count: 0 }
    entry.revenue += amount
    entry.count += 1
    typeMap.set(roomType, entry)
  }

  return Array.from(typeMap.entries())
    .map(([type, d]) => ({
      type,
      revenue: Math.round(d.revenue * 100) / 100,
      rooms_sold: d.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// --- Top Guests ---

interface TopGuestRow {
  rank: number
  name: string
  stays: number
  nights: number
  revenue: number
}

export async function getTopGuests(limit = 10): Promise<TopGuestRow[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('reservations')
    .select('total_amount, check_in, check_out, guest:guests(first_name, last_name)')
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error

  const guestMap = new Map<string, { name: string; stays: number; nights: number; revenue: number }>()

  for (const reservation of data ?? []) {
    const guest = reservation.guest as unknown as { first_name: string; last_name: string } | null
    if (!guest) continue
    const name = `${guest.first_name} ${guest.last_name}`
    const checkIn = new Date(reservation.check_in)
    const checkOut = new Date(reservation.check_out)
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    const entry = guestMap.get(name) ?? { name, stays: 0, nights: 0, revenue: 0 }
    entry.stays += 1
    entry.nights += nights
    entry.revenue += reservation.total_amount ?? 0
    guestMap.set(name, entry)
  }

  return Array.from(guestMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((g, i) => ({
      rank: i + 1,
      name: g.name,
      stays: g.stays,
      nights: g.nights,
      revenue: Math.round(g.revenue * 100) / 100,
    }))
}

// --- Summary KPIs ---

export interface ReportKPIs {
  totalRevenue: number
  revpar: number
  adr: number
  occupancyRate: number
  totalNightsSold: number
  totalGuests: number
}

export async function getReportKPIs(): Promise<ReportKPIs> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let roomQuery = supabase.from('rooms').select('id', { count: 'exact' })
  if (propId) roomQuery = roomQuery.eq('entity_id', propId)
  const { count: totalRooms } = await roomQuery

  let resQuery = supabase
    .from('reservations')
    .select('total_amount, check_in, check_out, guest_id')
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (propId) resQuery = resQuery.eq('entity_id', propId)

  const { data: reservations, error } = await resQuery

  if (error) throw error

  const roomCount = totalRooms ?? 1
  let totalRevenue = 0
  let totalNightsSold = 0
  const uniqueGuests = new Set<string>()

  for (const res of reservations ?? []) {
    totalRevenue += res.total_amount ?? 0
    const nights = Math.max(1, Math.ceil(
      (new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24)
    ))
    totalNightsSold += nights
    if (res.guest_id) uniqueGuests.add(res.guest_id)
  }

  const daysInYear = 365
  const totalRoomNights = roomCount * daysInYear
  const occupancyRate = totalRoomNights > 0
    ? Math.round((totalNightsSold / totalRoomNights) * 1000) / 10
    : 0
  const adr = totalNightsSold > 0
    ? Math.round((totalRevenue / totalNightsSold) * 100) / 100
    : 0
  const revpar = totalRoomNights > 0
    ? Math.round((totalRevenue / totalRoomNights) * 100) / 100
    : 0

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revpar,
    adr,
    occupancyRate,
    totalNightsSold,
    totalGuests: uniqueGuests.size,
  }
}
