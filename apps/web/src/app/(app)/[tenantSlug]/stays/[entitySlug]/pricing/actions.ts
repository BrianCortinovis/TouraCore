'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { z } from 'zod'
import { generateSuggestionsForEntity } from '@/lib/pricing-engine'

async function assertOwnsTenant(tenantSlug: string): Promise<{ tenantId: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) throw new Error('Tenant not found')

  const admin = await createServiceRoleClient()
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (pa) return { tenantId: tenant.id as string }

  const { data: m } = await admin.from('memberships').select('id').eq('user_id', user.id).eq('tenant_id', tenant.id).eq('is_active', true).maybeSingle()
  if (!m) throw new Error('Forbidden')
  return { tenantId: tenant.id as string }
}

async function assertEntityInTenant(entityId: string, tenantId: string): Promise<void> {
  const admin = await createServiceRoleClient()
  const { data: entity } = await admin.from('entities').select('id').eq('id', entityId).eq('tenant_id', tenantId).maybeSingle()
  if (!entity) throw new Error('Entity not in tenant')
}

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
  const { tenantId } = await assertOwnsTenant(parsed.tenantSlug)
  await assertEntityInTenant(parsed.entityId, tenantId)

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
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  await assertEntityInTenant(entityId, tenantId)
  const count = await generateSuggestionsForEntity(entityId, 30)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
  return { count }
}

export async function applySuggestion(suggestionId: string, tenantSlug: string, entitySlug: string) {
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  const admin = await createServiceRoleClient()
  const { data: sug } = await admin
    .from('pricing_suggestions')
    .select('entity_id, room_type_id, rate_plan_id, service_date, suggested_price, entities!inner(tenant_id)')
    .eq('id', suggestionId)
    .eq('entities.tenant_id', tenantId)
    .maybeSingle()
  if (!sug) throw new Error('Suggestion not in tenant')

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
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  const admin = await createServiceRoleClient()
  const { data: sug } = await admin
    .from('pricing_suggestions')
    .select('id, entities!inner(tenant_id)')
    .eq('id', suggestionId)
    .eq('entities.tenant_id', tenantId)
    .maybeSingle()
  if (!sug) throw new Error('Suggestion not in tenant')

  await admin.from('pricing_suggestions').delete().eq('id', suggestionId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
}

export async function deleteRule(ruleId: string, tenantSlug: string, entitySlug: string) {
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  const admin = await createServiceRoleClient()
  const { data: rule } = await admin
    .from('pricing_rules')
    .select('id, entities!inner(tenant_id)')
    .eq('id', ruleId)
    .eq('entities.tenant_id', tenantId)
    .maybeSingle()
  if (!rule) throw new Error('Rule not in tenant')

  await admin.from('pricing_rules').update({ active: false }).eq('id', ruleId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/pricing`)
}
