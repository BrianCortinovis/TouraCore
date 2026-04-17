'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { autoAssignTables } from '../reservations/auto-assign'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const AddSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  guestName: z.string().min(1),
  phone: z.string().optional(),
  partySize: z.number().int().min(1).max(40),
  estimatedWaitMin: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

const UpdateStatusSchema = z.object({
  waitlistId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  status: z.enum(['waiting', 'notified', 'seated', 'left', 'abandoned']),
})

const SeatNowSchema = z.object({
  waitlistId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  durationMinutes: z.number().int().optional(),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/waitlist`
}

export async function addWaitlistEntry(input: z.infer<typeof AddSchema>) {
  const parsed = AddSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('restaurant_waitlist').insert({
    restaurant_id: parsed.restaurantId,
    guest_name: parsed.guestName,
    phone: parsed.phone || null,
    party_size: parsed.partySize,
    estimated_wait_min: parsed.estimatedWaitMin ?? null,
    notes: parsed.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function updateWaitlistStatus(input: z.infer<typeof UpdateStatusSchema>) {
  const parsed = UpdateStatusSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data: w } = await admin.from('restaurant_waitlist').select('restaurant_id').eq('id', parsed.waitlistId).maybeSingle()
  if (!w) throw new Error('Waitlist entry not found')
  await assertUserOwnsRestaurant(w.restaurant_id as string)
  const update: Record<string, unknown> = { status: parsed.status, updated_at: new Date().toISOString() }
  if (parsed.status === 'notified') update.notified_at = new Date().toISOString()
  const { error } = await admin.from('restaurant_waitlist').update(update).eq('id', parsed.waitlistId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function seatWaitlistNow(input: z.infer<typeof SeatNowSchema>) {
  const parsed = SeatNowSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()

  const { data: entry } = await admin
    .from('restaurant_waitlist')
    .select('guest_name, phone, party_size')
    .eq('id', parsed.waitlistId)
    .single()

  if (!entry) throw new Error('Waitlist entry not found')

  const now = new Date()
  const slotDate = now.toISOString().slice(0, 10)
  const slotTime = now.toTimeString().slice(0, 5)

  const { data: tables } = await admin
    .from('restaurant_tables')
    .select('id, seats_min, seats_max, active, joinable_with')
    .eq('restaurant_id', parsed.restaurantId)
    .eq('active', true)

  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('table_ids, slot_date, slot_time, duration_minutes')
    .eq('restaurant_id', parsed.restaurantId)
    .eq('slot_date', slotDate)
    .in('status', ['confirmed', 'seated'])

  const conflicts = (existing ?? []).map((r) => {
    const start = new Date(`${r.slot_date as string}T${r.slot_time as string}`)
    return {
      table_ids: (r.table_ids as string[]) ?? [],
      start,
      end: new Date(start.getTime() + (r.duration_minutes as number) * 60_000),
    }
  })

  const tableIds = autoAssignTables({
    tables: (tables ?? []).map((t) => ({
      id: t.id as string,
      seats_min: t.seats_min as number,
      seats_max: t.seats_max as number,
      active: t.active as boolean,
      joinable_with: (t.joinable_with as string[]) ?? [],
    })),
    existing: conflicts,
    partySize: entry.party_size as number,
    slotDate,
    slotTime,
    durationMinutes: parsed.durationMinutes ?? 90,
  })

  if (tableIds.length === 0) {
    throw new Error('Nessun tavolo disponibile')
  }

  await admin.from('restaurant_reservations').insert({
    restaurant_id: parsed.restaurantId,
    guest_name: entry.guest_name as string,
    guest_phone: entry.phone as string | null,
    party_size: entry.party_size as number,
    slot_date: slotDate,
    slot_time: slotTime,
    duration_minutes: parsed.durationMinutes ?? 90,
    table_ids: tableIds,
    status: 'seated',
    source: 'walk_in',
    seated_at: now.toISOString(),
  })

  await admin
    .from('restaurant_waitlist')
    .update({ status: 'seated', seated_at: now.toISOString() })
    .eq('id', parsed.waitlistId)

  revalidatePath(pathFor(parsed))
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/reservations`)
}
