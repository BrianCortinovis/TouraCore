'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { z } from 'zod'

async function assertOwnsTenant(tenantSlug: string): Promise<{ tenantId: string; userId: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) throw new Error('Tenant not found')

  const admin = await createServiceRoleClient()
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (pa) return { tenantId: tenant.id as string, userId: user.id }

  const { data: m } = await admin.from('memberships').select('id').eq('user_id', user.id).eq('tenant_id', tenant.id).eq('is_active', true).maybeSingle()
  if (!m) throw new Error('Forbidden')
  return { tenantId: tenant.id as string, userId: user.id }
}

async function assertReviewInTenant(reviewId: string, tenantId: string): Promise<void> {
  const admin = await createServiceRoleClient()
  const { data: review } = await admin
    .from('reviews')
    .select('id, entities!inner(tenant_id)')
    .eq('id', reviewId)
    .eq('entities.tenant_id', tenantId)
    .maybeSingle()
  if (!review) throw new Error('Review not in tenant')
}

const ReplySchema = z.object({
  reviewId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  body: z.string().min(1).max(2000),
})

export async function replyToReview(input: z.infer<typeof ReplySchema>) {
  const parsed = ReplySchema.parse(input)
  const { tenantId, userId } = await assertOwnsTenant(parsed.tenantSlug)
  await assertReviewInTenant(parsed.reviewId, tenantId)

  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({
    reply_body: parsed.body,
    reply_at: new Date().toISOString(),
    reply_by_user_id: userId,
  }).eq('id', parsed.reviewId)

  revalidatePath(`/${parsed.tenantSlug}/stays/${parsed.entitySlug}/reviews`)
}

export async function flagReview(reviewId: string, tenantSlug: string, entitySlug: string) {
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  await assertReviewInTenant(reviewId, tenantId)
  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({ flagged: true }).eq('id', reviewId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/reviews`)
}

export async function hideReview(reviewId: string, tenantSlug: string, entitySlug: string) {
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  await assertReviewInTenant(reviewId, tenantId)
  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({ visible: false }).eq('id', reviewId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/reviews`)
}
