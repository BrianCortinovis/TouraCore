import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { jsonWithCors, loadRestaurantBySlug } from '../_shared'
import { autoAssignTables } from '@/app/(app)/[tenantSlug]/dine/[entitySlug]/reservations/auto-assign'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

const Body = z.object({
  slug: z.string(),
  guestName: z.string().min(1).max(120),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(5).max(40),
  partySize: z.number().int().min(1).max(40),
  slotDate: z.string(),
  slotTime: z.string(),
  serviceLabel: z.string().optional(),
  specialRequests: z.string().max(500).optional(),
  allergies: z.array(z.string()).max(14).default([]),
  occasion: z.string().max(80).optional(),
  source: z.enum(['widget', 'direct', 'phone']).default('widget'),
})

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const idempotencyKey = req.headers.get('idempotency-key')

  let parsed: z.infer<typeof Body>
  try {
    const body = await req.json()
    parsed = Body.parse(body)
  } catch (e) {
    return jsonWithCors(
      { error: e instanceof Error ? e.message : 'Invalid body' },
      { status: 400, origin },
    )
  }

  const ctx = await loadRestaurantBySlug(parsed.slug)
  if (!ctx) return jsonWithCors({ error: 'Restaurant not found' }, { status: 404, origin })

  const admin = await createServiceRoleClient()

  // Idempotency check
  if (idempotencyKey) {
    const { data: existing } = await admin
      .from('restaurant_reservations')
      .select('id, status, table_ids, deposit_amount')
      .eq('restaurant_id', ctx.id)
      .eq('notes_staff', `idemp:${idempotencyKey}`)
      .maybeSingle()
    if (existing) {
      return jsonWithCors(
        {
          reservationId: existing.id,
          status: existing.status,
          tableIds: existing.table_ids,
          depositAmount: existing.deposit_amount,
          idempotent: true,
        },
        { status: 200, origin },
      )
    }
  }

  const { data: tables } = await admin
    .from('restaurant_tables')
    .select('id, seats_min, seats_max, active, joinable_with')
    .eq('restaurant_id', ctx.id)
    .eq('active', true)

  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('table_ids, slot_date, slot_time, duration_minutes')
    .eq('restaurant_id', ctx.id)
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

  const tableIds = autoAssignTables({
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
    durationMinutes: ctx.avg_turn_minutes,
  })

  if (tableIds.length === 0) {
    return jsonWithCors({ error: 'No availability for this slot' }, { status: 409, origin })
  }

  const depositPolicy = ctx.deposit_policy
  const depositRequired = Boolean(
    depositPolicy.enabled && (!depositPolicy.above_party || parsed.partySize >= depositPolicy.above_party)
  )
  const depositAmount = depositRequired ? (depositPolicy.amount_per_cover ?? 0) * parsed.partySize : 0

  const { data, error } = await admin
    .from('restaurant_reservations')
    .insert({
      restaurant_id: ctx.id,
      guest_name: parsed.guestName,
      guest_email: parsed.guestEmail,
      guest_phone: parsed.guestPhone,
      party_size: parsed.partySize,
      slot_date: parsed.slotDate,
      slot_time: parsed.slotTime,
      service_label: parsed.serviceLabel ?? null,
      duration_minutes: ctx.avg_turn_minutes,
      table_ids: tableIds,
      status: depositRequired ? 'pending' : 'confirmed',
      source: parsed.source,
      special_requests: parsed.specialRequests ?? null,
      allergies: parsed.allergies,
      occasion: parsed.occasion ?? null,
      deposit_amount: depositAmount,
      deposit_status: depositRequired ? 'held' : null,
      notes_staff: idempotencyKey ? `idemp:${idempotencyKey}` : null,
    })
    .select('id')
    .single()

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500, origin })
  }

  return jsonWithCors(
    {
      reservationId: data.id,
      status: depositRequired ? 'pending_deposit' : 'confirmed',
      tableIds,
      depositRequired,
      depositAmount,
      checkoutRequired: depositRequired,
    },
    { status: 201, origin },
  )
}
