'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const Schema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  equipmentCode: z.string().min(1).max(40),
  equipmentName: z.string().min(1).max(80),
  temperatureC: z.number().min(-50).max(100),
  notes: z.string().optional(),
})

export async function recordTemperature(input: z.infer<typeof Schema>) {
  const parsed = Schema.parse(input)
  const admin = await createServiceRoleClient()
  await admin.from('haccp_temperature_log').insert({
    restaurant_id: parsed.restaurantId,
    equipment_code: parsed.equipmentCode,
    equipment_name: parsed.equipmentName,
    temperature_c: parsed.temperatureC,
    notes: parsed.notes ?? null,
  })
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/haccp`)
}
