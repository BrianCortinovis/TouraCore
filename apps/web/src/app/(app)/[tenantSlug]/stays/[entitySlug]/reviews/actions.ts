'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { z } from 'zod'

const ReplySchema = z.object({
  reviewId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  body: z.string().min(1).max(2000),
})

export async function replyToReview(input: z.infer<typeof ReplySchema>) {
  const parsed = ReplySchema.parse(input)
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({
    reply_body: parsed.body,
    reply_at: new Date().toISOString(),
    reply_by_user_id: user.id,
  }).eq('id', parsed.reviewId)

  revalidatePath(`/${parsed.tenantSlug}/stays/${parsed.entitySlug}/reviews`)
}

export async function flagReview(reviewId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({ flagged: true }).eq('id', reviewId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/reviews`)
}

export async function hideReview(reviewId: string, tenantSlug: string, entitySlug: string) {
  const admin = await createServiceRoleClient()
  await admin.from('reviews').update({ visible: false }).eq('id', reviewId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/reviews`)
}
