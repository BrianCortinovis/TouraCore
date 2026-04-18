'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  createPartner as createPartnerCore,
  updatePartner as updatePartnerCore,
  createPartnerLink as createPartnerLinkCore,
  createApiKey as createApiKeyCore,
} from '@touracore/partners/server'

const CreatePartnerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  kind: z.enum(['hotel', 'tour_operator', 'travel_agent', 'influencer', 'ota', 'affiliate', 'corporate', 'other']),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  companyName: z.string().optional(),
  country: z.string().default('IT'),
  commissionPctDefault: z.number().min(0).max(100).default(10),
  commissionPerVertical: z.record(z.string(), z.number()).default({}),
  notes: z.string().max(2000).optional(),
})

export async function createPartnerAction(input: z.input<typeof CreatePartnerSchema>) {
  const parsed = CreatePartnerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'invalid' }
  const b = await getAuthBootstrapData()
  if (!b.tenant) return { success: false, error: 'TENANT_REQUIRED' }
  const p = await createPartnerCore({
    tenantId: b.tenant.id,
    ...parsed.data,
  })
  if (!p) return { success: false, error: 'insert_failed' }
  revalidatePath('/settings/partners')
  return { success: true, id: p.id }
}

export async function updatePartnerStatusAction(input: {
  id: string
  status: 'pending' | 'active' | 'suspended' | 'terminated'
}) {
  const b = await getAuthBootstrapData()
  if (!b.tenant) return { success: false, error: 'TENANT_REQUIRED' }
  const ok = await updatePartnerCore({
    id: input.id,
    tenantId: b.tenant.id,
    patch: { status: input.status },
  })
  revalidatePath('/settings/partners')
  return { success: ok }
}

export async function createPartnerLinkAction(input: {
  partnerId: string
  label?: string
  channel?: 'url' | 'embed' | 'api' | 'social' | 'email' | 'print' | 'other'
  targetEntityId?: string
  commissionPctOverride?: number
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  validUntil?: string
}) {
  const b = await getAuthBootstrapData()
  if (!b.tenant) return { success: false, error: 'TENANT_REQUIRED' }
  const link = await createPartnerLinkCore({ ...input, tenantId: b.tenant.id })
  if (!link) return { success: false, error: 'insert_failed' }
  revalidatePath(`/settings/partners/${input.partnerId}`)
  return { success: true, code: link.code, id: link.id }
}

export async function createApiKeyAction(input: {
  partnerId: string
  name: string
  scope: string[]
  environment?: 'live' | 'sandbox'
  rateLimitPerMinute?: number
}) {
  const b = await getAuthBootstrapData()
  if (!b.tenant || !b.user) return { success: false, error: 'TENANT_REQUIRED' }
  const k = await createApiKeyCore({
    ...input,
    tenantId: b.tenant.id,
    createdByUserId: b.user.id,
  })
  if (!k) return { success: false, error: 'insert_failed' }
  revalidatePath(`/settings/partners/${input.partnerId}`)
  return {
    success: true,
    keyId: k.keyId,
    secret: k.secret,
    secretLast4: k.secretLast4,
  }
}
