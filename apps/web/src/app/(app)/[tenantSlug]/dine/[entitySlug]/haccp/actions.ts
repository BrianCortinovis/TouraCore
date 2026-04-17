'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const Schema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  equipmentCode: z.string().min(1).max(40),
  equipmentName: z.string().min(1).max(80),
  temperatureC: z.number().min(-50).max(100),
  notes: z.string().optional(),
})

const SanitationSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  areaCode: z.string().min(1).max(40),
  areaName: z.string().min(1).max(80),
  productUsed: z.string().optional(),
  notes: z.string().optional(),
})

export async function recordSanitation(input: z.infer<typeof SanitationSchema>) {
  const parsed = SanitationSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()
  await admin.from('haccp_sanitation_log').insert({
    restaurant_id: parsed.restaurantId,
    area_code: parsed.areaCode,
    area_name: parsed.areaName,
    product_used: parsed.productUsed ?? null,
    notes: parsed.notes ?? null,
  })
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/haccp`)
}

export async function exportHACCPCsv(input: { restaurantId: string; fromDate: string; toDate: string }): Promise<{ ok: boolean; csv?: string; filename?: string; error?: string }> {
  await assertUserOwnsRestaurant(input.restaurantId)
  const admin = await createServiceRoleClient()

  const [{ data: temps }, { data: sanitation }] = await Promise.all([
    admin
      .from('haccp_temperature_log')
      .select('reading_at, equipment_code, equipment_name, temperature_c, notes')
      .eq('restaurant_id', input.restaurantId)
      .gte('reading_at', input.fromDate)
      .lte('reading_at', input.toDate + 'T23:59:59Z')
      .order('reading_at'),
    admin
      .from('haccp_sanitation_log')
      .select('performed_at, area_code, area_name, product_used, notes')
      .eq('restaurant_id', input.restaurantId)
      .gte('performed_at', input.fromDate)
      .lte('performed_at', input.toDate + 'T23:59:59Z')
      .order('performed_at'),
  ])

  const csv: string[] = ['"Sezione","Quando","Codice","Descrizione","Valore","Note"']
  for (const t of temps ?? []) {
    csv.push(`"TEMPERATURE","${t.reading_at}","${t.equipment_code}","${(t.equipment_name as string).replace(/"/g, '""')}","${t.temperature_c}°C","${((t.notes as string) ?? '').replace(/"/g, '""')}"`)
  }
  for (const s of sanitation ?? []) {
    csv.push(`"SANIFICAZIONE","${s.performed_at}","${s.area_code}","${(s.area_name as string).replace(/"/g, '""')}","${(s.product_used as string) ?? ''}","${((s.notes as string) ?? '').replace(/"/g, '""')}"`)
  }

  return {
    ok: true,
    csv: csv.join('\n'),
    filename: `haccp_${input.restaurantId.slice(0, 8)}_${input.fromDate}_${input.toDate}.csv`,
  }
}

export async function recordTemperature(input: z.infer<typeof Schema>) {
  const parsed = Schema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
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
