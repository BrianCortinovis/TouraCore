'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const StationSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  printerIp: z.string().optional(),
})

const StatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(['preparing', 'ready', 'served']),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

export async function createStation(input: z.infer<typeof StationSchema>) {
  const parsed = StationSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('kitchen_stations').insert({
    restaurant_id: parsed.restaurantId,
    code: parsed.code,
    name: parsed.name,
    printer_ip: parsed.printerIp ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/kds`)
}

const FireCourseSchema = z.object({
  orderId: z.string().uuid(),
  courseNumber: z.number().int().min(1).max(5),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

export async function fireCourse(input: z.infer<typeof FireCourseSchema>) {
  const parsed = FireCourseSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data: order } = await admin.from('restaurant_orders').select('restaurant_id').eq('id', parsed.orderId).maybeSingle()
  if (!order) throw new Error('Order not found')
  await assertUserOwnsRestaurant(order.restaurant_id as string)

  // Mark all items of course as 'sent' (fired)
  await admin
    .from('order_items')
    .update({ status: 'sent', fired_at: new Date().toISOString() })
    .eq('order_id', parsed.orderId)
    .eq('course_number', parsed.courseNumber)
    .eq('status', 'open')

  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/kds`)
}

export async function updateOrderItemStatus(input: z.infer<typeof StatusSchema>) {
  const parsed = StatusSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data: oi } = await admin.from('order_items').select('restaurant_id').eq('id', parsed.itemId).maybeSingle()
  if (!oi) throw new Error('Order item not found')
  await assertUserOwnsRestaurant(oi.restaurant_id as string)
  const update: Record<string, unknown> = {
    status: parsed.status,
    updated_at: new Date().toISOString(),
  }
  if (parsed.status === 'ready') update.ready_at = new Date().toISOString()
  if (parsed.status === 'served') update.served_at = new Date().toISOString()

  await admin.from('order_items').update(update).eq('id', parsed.itemId)
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/kds`)
}
