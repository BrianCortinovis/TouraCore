'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

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

export async function updateOrderItemStatus(input: z.infer<typeof StatusSchema>) {
  const parsed = StatusSchema.parse(input)
  const admin = await createServiceRoleClient()
  const update: Record<string, unknown> = {
    status: parsed.status,
    updated_at: new Date().toISOString(),
  }
  if (parsed.status === 'ready') update.ready_at = new Date().toISOString()
  if (parsed.status === 'served') update.served_at = new Date().toISOString()

  await admin.from('order_items').update(update).eq('id', parsed.itemId)
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/kds`)
}
