import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { CheckinToken, Reservation, Guest, RoomType, Property } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckinTokenWithRelations = CheckinToken & {
  reservation: Reservation & {
    guest: Guest
    room_type: RoomType
  }
}

export type CheckinTokenPublic = CheckinToken & {
  reservation: Reservation & {
    guest: Guest
    room_type: RoomType
    property: Property
  }
}

const CHECKIN_SELECT = `
  *,
  reservation:reservations(
    *,
    guest:guests(*),
    room_type:room_types(*)
  )
`

const CHECKIN_PUBLIC_SELECT = `
  *,
  reservation:reservations(
    *,
    guest:guests(*),
    room_type:room_types(*),
    entity:entities(*),
    accommodation:accommodations(*)
  )
`

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getCheckinTokensByProperty() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  if (!propId) throw new Error('Property not found')

  const { data, error } = await supabase
    .from('checkin_tokens')
    .select(CHECKIN_SELECT)
    .eq('entity_id', propId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CheckinTokenWithRelations[]
}

export async function getCheckinByToken(token: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('checkin_tokens')
    .select(CHECKIN_PUBLIC_SELECT)
    .eq('token', token)
    .single()

  if (error) throw error

  const reservation = data?.reservation as Record<string, unknown> | null
  const entity = reservation?.entity as Record<string, unknown> | null
  const accommodation = reservation?.accommodation as Record<string, unknown> | null

  const property = entity || accommodation
    ? {
        ...(entity ?? {}),
        ...(accommodation ?? {}),
        type: (accommodation?.property_type as string | undefined) ?? null,
      }
    : null

  const { reservation: reservationRaw, ...tokenData } = data as Record<string, unknown>
  const { entity: _entity, accommodation: _accommodation, ...reservationData } =
    (reservation ?? {}) as Record<string, unknown>

  return {
    ...(tokenData as unknown as CheckinToken),
    reservation: {
      ...(reservationData as unknown as Reservation),
      property: property as Property,
    },
  } as CheckinTokenPublic
}

export async function getCheckinByReservation(reservationId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  if (!propId) throw new Error('Property not found')

  const { data, error } = await supabase
    .from('checkin_tokens')
    .select(CHECKIN_SELECT)
    .eq('reservation_id', reservationId)
    .eq('entity_id', propId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as CheckinTokenWithRelations | null
}
