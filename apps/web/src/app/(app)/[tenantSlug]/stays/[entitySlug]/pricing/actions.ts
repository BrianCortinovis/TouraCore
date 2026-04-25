'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { generateSuggestionsForEntity } from '@/lib/pricing-engine'

const RuleSchema = z.object({
  entityId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  ruleType: z.enum(['occupancy_based','lead_time','day_of_week','season','event','competitor','last_minute','early_bird']),
  name: z.string().min(1).max(80),
  config: z.record(z.string(), z.unknown()).default({}),
  adjustmentType: z.enum(['percent','fixed']),
  adjustmentValue: z.number(),
  priority: z.number().int().default(0),
})

export async function createPricingRule(input: z.infer<typeof RuleSchema>) {
  const parsed = RuleSchema.parse(input)
  const admin = await createServiceRoleClient()
  await admin.from('pricing_rules').insert({
    entity_id: parsed.entityId,
    rule_type: parsed.ruleType,
    name: parsed.name,
    config: parsed.config,
    adjustment_type: parsed.adjustmentType,
    adjustment_value: parsed.adjustmentValue,
    priority: parsed.priority,
    active: true,
  })
  revalidatePath(`/${parsed.tenantSlug}/stays/${parsed.entitySlug}/pricing`)
}

export async function regenerateSuggestions(entityId: string, tenantSlug: string, entitySlug: string): Promise<{ count: number }> {
  const count = await generateSuggestionsForEntity(entityId, 30)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
  return { count }
}

export async function applySuggestion(suggestionId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  const { data: sug } = await admin.from('pricing_suggestions').select('entity_id, room_type_id, rate_plan_id, service_date, suggested_price').eq('id', suggestionId).single()
  if (!sug) throw new Error('Suggestion not found')

  // Update rates table (or create if missing)
  await admin.from('rates').upsert({
    room_type_id: sug.room_type_id,
    rate_plan_id: sug.rate_plan_id,
    date: sug.service_date,
    price: sug.suggested_price,
  }, { onConflict: 'room_type_id,rate_plan_id,date' })

  await admin.from('pricing_suggestions').update({
    applied: true,
    applied_at: new Date().toISOString(),
  }).eq('id', suggestionId)

  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
}

export async function dismissSuggestion(suggestionId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  await admin.from('pricing_suggestions').delete().eq('id', suggestionId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
}

export async function deleteRule(ruleId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  await admin.from('pricing_rules').update({ active: false }).eq('id', ruleId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
}
