'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const SettingsSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  cuisine_type: z.array(z.string()).default([]),
  price_range: z.number().int().min(1).max(4),
  capacity_total: z.number().int().min(0),
  avg_turn_minutes: z.number().int().min(15).max(480),
  reservation_mode: z.enum(['slot', 'rolling', 'hybrid']),
})

export async function ensureRestaurantRecord(entityId: string, tenantId: string): Promise<void> {
  // Caller (layout) ha già validato access via assertTenantModuleActive + entity check
  const admin = await createServiceRoleClient()
  const { data: existing } = await admin.from('restaurants').select('id').eq('id', entityId).maybeSingle()
  if (existing) return
  await admin.from('restaurants').insert({
    id: entityId,
    tenant_id: tenantId,
  })
}

export async function saveRestaurantSettings(input: z.infer<typeof SettingsSchema>) {
  const parsed = SettingsSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()

  const { error } = await admin
    .from('restaurants')
    .update({
      cuisine_type: parsed.cuisine_type,
      price_range: parsed.price_range,
      capacity_total: parsed.capacity_total,
      avg_turn_minutes: parsed.avg_turn_minutes,
      reservation_mode: parsed.reservation_mode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.restaurantId)

  if (error) throw new Error(error.message)
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/settings`)
}
