'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const PromoSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  code: z.string().optional(),
  name: z.string().min(1).max(80),
  promoType: z.enum(['early_bird','happy_hour','percent_off','fixed_off','free_item','combo']),
  valuePct: z.number().optional(),
  valueAmount: z.number().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  maxUses: z.number().int().optional(),
  conditions: z.record(z.string(), z.unknown()).default({}),
})

export async function createPromo(input: z.infer<typeof PromoSchema>) {
  const parsed = PromoSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()
  await admin.from('restaurant_promotions').insert({
    restaurant_id: parsed.restaurantId,
    code: parsed.code ?? null,
    name: parsed.name,
    promo_type: parsed.promoType,
    value_pct: parsed.valuePct ?? null,
    value_amount: parsed.valueAmount ?? null,
    valid_from: parsed.validFrom,
    valid_to: parsed.validTo,
    max_uses: parsed.maxUses ?? null,
    conditions: parsed.conditions,
    active: true,
  })
  revalidatePath(`/${parsed.tenantSlug}/dine/${parsed.entitySlug}/promotions`)
}

export async function deletePromo(promoId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  const { data: p } = await admin.from('restaurant_promotions').select('restaurant_id').eq('id', promoId).single()
  if (!p) throw new Error('Promo not found')
  await assertUserOwnsRestaurant(p.restaurant_id as string)
  await admin.from('restaurant_promotions').update({ active: false }).eq('id', promoId)
  revalidatePath(`/${tenantSlug}/dine/${entitySlug}/promotions`)
}
