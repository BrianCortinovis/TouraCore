'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const OpenOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  tableId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  partySize: z.number().int().min(1).default(1),
  serviceLabel: z.string().optional(),
})

const AddItemSchema = z.object({
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  qty: z.number().int().min(1).default(1),
  modifiers: z.array(z.object({ name: z.string(), priceDelta: z.number() })).default([]),
  notes: z.string().optional(),
  guestIndex: z.number().int().optional(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

const SendKitchenSchema = z.object({
  orderId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

const CloseOrderSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(['cash', 'card', 'charge_to_room']),
  chargeToRoomReservationId: z.string().uuid().optional(),
  serviceChargePct: z.number().min(0).max(30).default(0),
  coverChargePerGuest: z.number().min(0).default(0),
  tipAmount: z.number().min(0).default(0),
  splitMode: z.enum(['none', 'item', 'cover', 'pct']).default('none'),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

const VoidItemSchema = z.object({
  itemId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/pos`
}

export async function openOrder(input: z.infer<typeof OpenOrderSchema>) {
  const parsed = OpenOrderSchema.parse(input)
  const admin = await createServiceRoleClient()

  // Cerca order già open su questo tavolo
  if (parsed.tableId) {
    const { data: existing } = await admin
      .from('restaurant_orders')
      .select('id')
      .eq('restaurant_id', parsed.restaurantId)
      .eq('table_id', parsed.tableId)
      .in('status', ['open', 'sent'])
      .maybeSingle()
    if (existing) return { orderId: existing.id as string, existing: true }
  }

  const { data, error } = await admin
    .from('restaurant_orders')
    .insert({
      restaurant_id: parsed.restaurantId,
      table_id: parsed.tableId ?? null,
      reservation_id: parsed.reservationId ?? null,
      party_size: parsed.partySize,
      service_label: parsed.serviceLabel ?? null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
  return { orderId: data.id as string, existing: false }
}

export async function addItemToOrder(input: z.infer<typeof AddItemSchema>) {
  const parsed = AddItemSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: menuItem } = await admin
    .from('menu_items')
    .select('name, price_base, vat_pct, course_number, station_code')
    .eq('id', parsed.menuItemId)
    .single()

  if (!menuItem) throw new Error('Menu item not found')

  const modifierDelta = parsed.modifiers.reduce((sum, m) => sum + m.priceDelta, 0)

  const { error } = await admin.from('order_items').insert({
    order_id: parsed.orderId,
    menu_item_id: parsed.menuItemId,
    item_name: menuItem.name as string,
    qty: parsed.qty,
    unit_price: menuItem.price_base,
    modifiers: parsed.modifiers,
    modifier_delta: modifierDelta,
    vat_pct: menuItem.vat_pct,
    course_number: menuItem.course_number,
    station_code: menuItem.station_code,
    guest_index: parsed.guestIndex ?? null,
    notes: parsed.notes ?? null,
    status: 'open',
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function sendOrderToKitchen(input: z.infer<typeof SendKitchenSchema>) {
  const parsed = SendKitchenSchema.parse(input)
  const admin = await createServiceRoleClient()

  const now = new Date().toISOString()
  await admin
    .from('order_items')
    .update({ status: 'sent', fired_at: now })
    .eq('order_id', parsed.orderId)
    .eq('status', 'open')

  await admin
    .from('restaurant_orders')
    .update({ status: 'sent', sent_at: now })
    .eq('id', parsed.orderId)
    .eq('status', 'open')

  revalidatePath(pathFor(parsed))
}

export async function voidOrderItem(input: z.infer<typeof VoidItemSchema>) {
  const parsed = VoidItemSchema.parse(input)
  const admin = await createServiceRoleClient()
  await admin.from('order_items').update({ status: 'voided' }).eq('id', parsed.itemId)
  revalidatePath(pathFor(parsed))
}

export async function closeOrder(input: z.infer<typeof CloseOrderSchema>) {
  const parsed = CloseOrderSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: order } = await admin
    .from('restaurant_orders')
    .select('subtotal, party_size')
    .eq('id', parsed.orderId)
    .single()
  if (!order) throw new Error('Order not found')

  const subtotal = Number(order.subtotal)
  const serviceCharge = +(subtotal * (parsed.serviceChargePct / 100)).toFixed(2)
  const coverCharge = +(parsed.coverChargePerGuest * (order.party_size as number)).toFixed(2)

  await admin
    .from('restaurant_orders')
    .update({
      status: 'closed',
      service_charge: serviceCharge,
      cover_charge: coverCharge,
      tip_amount: parsed.tipAmount,
      payment_method: parsed.paymentMethod,
      payment_status: 'paid',
      charge_to_room_reservation_id: parsed.chargeToRoomReservationId ?? null,
      closed_at: new Date().toISOString(),
    })
    .eq('id', parsed.orderId)

  await admin.rpc('recalc_restaurant_order_totals', { p_order_id: parsed.orderId })

  // Charge to room: crea folio_charge sulla reservation hospitality
  if (parsed.paymentMethod === 'charge_to_room' && parsed.chargeToRoomReservationId) {
    const { data: orderFinal } = await admin
      .from('restaurant_orders')
      .select('total, vat_total')
      .eq('id', parsed.orderId)
      .single()

    if (orderFinal) {
      await admin.from('folio_charges').insert({
        reservation_id: parsed.chargeToRoomReservationId,
        source: 'restaurant_order',
        source_id: parsed.orderId,
        description: `Ristorante · ordine ${parsed.orderId.slice(0, 8)}`,
        amount: orderFinal.total,
        vat_amount: orderFinal.vat_total,
      })
    }
  }

  revalidatePath(pathFor(parsed))
}

// Helper: cerca reservations hospitality in-house oggi
export async function findInHouseStays(restaurantId: string): Promise<Array<{
  id: string
  reservationCode: string
  guestName: string
  checkIn: string
  checkOut: string
}>> {
  const admin = await createServiceRoleClient()

  // Restaurant -> entity tenant
  const { data: rest } = await admin
    .from('restaurants')
    .select('tenant_id, parent_entity_id')
    .eq('id', restaurantId)
    .maybeSingle()
  if (!rest) return []

  const today = new Date().toISOString().slice(0, 10)
  let q = admin
    .from('reservations')
    .select('id, reservation_code, guest_id, check_in, check_out, entity_id, status, guests(first_name, last_name)')
    .lte('check_in', today)
    .gte('check_out', today)
    .in('status', ['checked_in', 'confirmed'])

  if (rest.parent_entity_id) {
    q = q.eq('entity_id', rest.parent_entity_id)
  } else {
    // Filter via entities tenant chain
    const { data: tenantEntities } = await admin
      .from('entities')
      .select('id')
      .eq('tenant_id', rest.tenant_id)
      .eq('kind', 'accommodation')
    const ids = (tenantEntities ?? []).map((e) => e.id as string)
    if (ids.length === 0) return []
    q = q.in('entity_id', ids)
  }

  const { data } = await q.limit(50)
  return (data ?? []).map((r) => {
    const g = Array.isArray(r.guests) ? r.guests[0] : r.guests
    return {
      id: r.id as string,
      reservationCode: r.reservation_code as string,
      guestName: g ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : 'Ospite',
      checkIn: r.check_in as string,
      checkOut: r.check_out as string,
    }
  })
}
