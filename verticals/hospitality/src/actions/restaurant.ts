'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateOrderData {
  restaurant_service_id: string
  table_id?: string | null
  reservation_id?: string | null
  guest_id?: string | null
  covers: number
  charge_to_room?: boolean
  notes?: string | null
}

export interface AddOrderItemData {
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function revalidateRestaurantPaths() {
  revalidatePath('/restaurant')
  revalidatePath('/dashboard')
}

// ---------------------------------------------------------------------------
// Order Actions
// ---------------------------------------------------------------------------

/**
 * Create a new restaurant order.
 * Generates an order number in the format ORD-YYYYMMDD-NNN.
 */
export async function createRestaurantOrder(data: CreateOrderData) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  // Generate order number
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const { count } = await supabase
    .from('restaurant_orders')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', orgId)
    .eq('order_date', today.toISOString().slice(0, 10))

  const orderNumber = `ORD-${dateStr}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: order, error } = await supabase
    .from('restaurant_orders')
    .insert({
      entity_id: orgId,
      restaurant_service_id: data.restaurant_service_id,
      table_id: data.table_id ?? null,
      reservation_id: data.reservation_id ?? null,
      guest_id: data.guest_id ?? null,
      order_number: orderNumber,
      order_date: today.toISOString().slice(0, 10),
      order_time: today.toTimeString().slice(0, 8),
      covers: data.covers,
      status: 'open',
      charge_to_room: data.charge_to_room ?? false,
      subtotal: 0,
      vat_amount: 0,
      total: 0,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Errore creazione ordine: ${error.message}`)

  revalidateRestaurantPaths()
  return order
}

/**
 * Add an item to a restaurant order and recalculate totals.
 */
export async function addOrderItem(data: AddOrderItemData) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('restaurant_order_items')
    .insert({
      order_id: data.order_id,
      menu_item_id: data.menu_item_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total: data.quantity * data.unit_price,
      notes: data.notes ?? null,
    })

  if (error) throw new Error(`Errore aggiunta articolo: ${error.message}`)

  // Recalculate order totals
  await recalculateOrderTotals(data.order_id)

  revalidateRestaurantPaths()
}

/**
 * Remove an item from a restaurant order and recalculate totals.
 */
export async function removeOrderItem(itemId: string, orderId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('restaurant_order_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`Errore rimozione articolo: ${error.message}`)

  await recalculateOrderTotals(orderId)
  revalidateRestaurantPaths()
}

/**
 * Update order status (open → preparing → served → closed).
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'open' | 'preparing' | 'served' | 'closed' | 'cancelled'
) {
  const supabase = await createServerSupabaseClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'closed') {
    updateData.closed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('restaurant_orders')
    .update(updateData)
    .eq('id', orderId)

  if (error) throw new Error(`Errore aggiornamento stato ordine: ${error.message}`)

  revalidateRestaurantPaths()
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function recalculateOrderTotals(orderId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: items } = await supabase
    .from('restaurant_order_items')
    .select('total')
    .eq('order_id', orderId)

  const subtotal = (items ?? []).reduce((sum, item) => sum + (item.total ?? 0), 0)
  const vatRate = 0.10 // 10% IVA ristorazione
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  await supabase
    .from('restaurant_orders')
    .update({
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: vatAmount,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
}
