'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import {
  upsertRatePlan,
  deleteRatePlan,
  ensureDefaultRatePlan,
  type Vertical,
} from '@touracore/billing/server'

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  entityId: z.string().uuid(),
  vertical: z.enum(['hospitality', 'restaurant', 'bike', 'experience']),
  type: z.enum(['free_cancellation', 'deposit_30', 'partially_refundable_50', 'non_refundable']),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  refundWindowHours: z.number().int().min(0).max(8760).optional(),
  depositPct: z.number().min(0).max(100).nullable().optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  chargeBalanceDaysBefore: z.number().int().min(0).max(365).nullable().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
})

export async function upsertRatePlanAction(
  input: z.infer<typeof UpsertSchema>,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = UpsertSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id, slug')
    .eq('id', parsed.data.entityId)
    .maybeSingle()
  if (!entity) return { ok: false, error: 'ENTITY_NOT_FOUND' }

  const e = entity as { id: string; tenant_id: string; slug: string }

  try {
    const rp = await upsertRatePlan({
      ...parsed.data,
      tenantId: e.tenant_id,
    })
    revalidatePath(`/[tenantSlug]/stays/[entitySlug]/rate-plans`, 'page')
    return { ok: true, id: rp.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function deleteRatePlanAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'invalid_id' }
  try {
    await deleteRatePlan(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function ensureDefaultsAction(
  entityId: string,
  vertical: Vertical,
): Promise<{ ok: boolean }> {
  if (!z.string().uuid().safeParse(entityId).success) return { ok: false }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', entityId)
    .maybeSingle()
  if (!entity) return { ok: false }

  await ensureDefaultRatePlan((entity as { tenant_id: string }).tenant_id, entityId, vertical)
  return { ok: true }
}
