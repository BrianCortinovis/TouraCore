'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { autoAssignTables } from './auto-assign'

const CreateReservationSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  guestName: z.string().min(1),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  partySize: z.number().int().min(1).max(40),
  slotDate: z.string(),
  slotTime: z.string(),
  serviceLabel: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(480).default(90),
  specialRequests: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  occasion: z.string().optional(),
  tableIds: z.array(z.string().uuid()).optional(),
})

const UpdateStatusSchema = z.object({
  reservationId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  status: z.enum(['pending', 'confirmed', 'seated', 'finished', 'cancelled', 'no_show']),
})

const MoveReservationSchema = z.object({
  reservationId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  tableIds: z.array(z.string().uuid()).min(1),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/reservations`
}

export async function createReservation(input: z.infer<typeof CreateReservationSchema>) {
  const parsed = CreateReservationSchema.parse(input)
  const admin = await createServiceRoleClient()

  let tableIds = parsed.tableIds ?? []
  if (tableIds.length === 0) {
    const { data: tables } = await admin
      .from('restaurant_tables')
      .select('id, seats_min, seats_max, active, joinable_with')
      .eq('restaurant_id', parsed.restaurantId)
      .eq('active', true)

    const { data: existing } = await admin
      .from('restaurant_reservations')
      .select('table_ids, slot_date, slot_time, duration_minutes')
      .eq('restaurant_id', parsed.restaurantId)
      .eq('slot_date', parsed.slotDate)
      .in('status', ['confirmed', 'seated'])

    const conflicts = (existing ?? []).map((r) => {
      const start = new Date(`${r.slot_date as string}T${r.slot_time as string}`)
      return {
        table_ids: (r.table_ids as string[]) ?? [],
        start,
        end: new Date(start.getTime() + (r.duration_minutes as number) * 60_000),
      }
    })

    tableIds = autoAssignTables({
      tables: (tables ?? []).map((t) => ({
        id: t.id as string,
        seats_min: t.seats_min as number,
        seats_max: t.seats_max as number,
        active: t.active as boolean,
        joinable_with: (t.joinable_with as string[]) ?? [],
      })),
      existing: conflicts,
      partySize: parsed.partySize,
      slotDate: parsed.slotDate,
      slotTime: parsed.slotTime,
      durationMinutes: parsed.durationMinutes,
    })
  }

  const { data, error } = await admin
    .from('restaurant_reservations')
    .insert({
      restaurant_id: parsed.restaurantId,
      guest_name: parsed.guestName,
      guest_phone: parsed.guestPhone || null,
      guest_email: parsed.guestEmail || null,
      party_size: parsed.partySize,
      slot_date: parsed.slotDate,
      slot_time: parsed.slotTime,
      service_label: parsed.serviceLabel || null,
      duration_minutes: parsed.durationMinutes,
      table_ids: tableIds,
      status: tableIds.length > 0 ? 'confirmed' : 'pending',
      source: 'direct',
      special_requests: parsed.specialRequests || null,
      allergies: parsed.allergies,
      occasion: parsed.occasion || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
  return { reservationId: data.id as string, autoAssignedTableIds: tableIds }
}

export async function updateReservationStatus(input: z.infer<typeof UpdateStatusSchema>) {
  const parsed = UpdateStatusSchema.parse(input)
  const admin = await createServiceRoleClient()
  const update: Record<string, unknown> = {
    status: parsed.status,
    updated_at: new Date().toISOString(),
  }
  if (parsed.status === 'seated') update.seated_at = new Date().toISOString()
  if (parsed.status === 'finished') update.finished_at = new Date().toISOString()

  const { error } = await admin
    .from('restaurant_reservations')
    .update(update)
    .eq('id', parsed.reservationId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function moveReservation(input: z.infer<typeof MoveReservationSchema>) {
  const parsed = MoveReservationSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin
    .from('restaurant_reservations')
    .update({ table_ids: parsed.tableIds, updated_at: new Date().toISOString() })
    .eq('id', parsed.reservationId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}
