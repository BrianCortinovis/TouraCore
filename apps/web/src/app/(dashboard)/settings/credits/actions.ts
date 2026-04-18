'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  issueCredit as issueCreditCore,
  setCreditStatus as setCreditStatusCore,
  refundCredit as refundCreditCore,
} from '@touracore/vouchers/server'

const CREDIT_KINDS = ['gift_card', 'voucher', 'promo_code', 'store_credit'] as const
const DISCOUNT_TYPES = ['percent', 'fixed', 'stored_value'] as const
const VERTICALS = ['hospitality', 'restaurant', 'bike_rental', 'experiences', 'wellness'] as const

const IssueSchema = z.object({
  kind: z.enum(CREDIT_KINDS),
  initialAmount: z.number().min(0),
  currency: z.string().default('EUR'),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().min(1).optional(),
  maxAmountPerUse: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountValue: z.number().min(0).optional(),
  entityScope: z.array(z.string().uuid()).default([]),
  verticalScope: z.array(z.enum(VERTICALS)).default([]),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(200).optional(),
  senderName: z.string().max(200).optional(),
  personalMessage: z.string().max(2000).optional(),
  designId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export type IssueCreditInput = z.input<typeof IssueSchema>

export async function issueCreditAction(input: IssueCreditInput): Promise<{
  success: boolean
  error?: string
  code?: string
  id?: string
  codeLast4?: string
}> {
  const parsed = IssueSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'invalid_input: ' + parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) {
    return { success: false, error: 'TENANT_REQUIRED' }
  }

  try {
    const issued = await issueCreditCore({
      tenantId: bootstrap.tenant.id,
      kind: parsed.data.kind,
      initialAmount: parsed.data.initialAmount,
      currency: parsed.data.currency,
      expiresAt: parsed.data.expiresAt,
      maxUses: parsed.data.maxUses,
      maxAmountPerUse: parsed.data.maxAmountPerUse,
      minPurchaseAmount: parsed.data.minPurchaseAmount,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      entityScope: parsed.data.entityScope,
      verticalScope: parsed.data.verticalScope,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      senderName: parsed.data.senderName,
      personalMessage: parsed.data.personalMessage,
      designId: parsed.data.designId,
      notes: parsed.data.notes,
      issuedVia: 'manual',
      issuedByUserId: bootstrap.user.id,
    })
    revalidatePath('/settings/credits')
    return {
      success: true,
      code: issued.code, // plaintext ritornato UNA VOLTA
      id: issued.id,
      codeLast4: issued.codeLast4,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function setCreditStatusAction(input: {
  id: string
  status: 'active' | 'suspended' | 'cancelled'
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) return { success: false, error: 'TENANT_REQUIRED' }
  const ok = await setCreditStatusCore({
    creditInstrumentId: input.id,
    tenantId: bootstrap.tenant.id,
    status: input.status,
    reason: input.reason,
    actorUserId: bootstrap.user.id,
  })
  if (!ok) return { success: false, error: 'failed' }
  revalidatePath('/settings/credits')
  return { success: true }
}

export async function refundCreditAction(input: {
  id: string
  amount: number
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) return { success: false, error: 'TENANT_REQUIRED' }
  const res = await refundCreditCore({
    creditInstrumentId: input.id,
    tenantId: bootstrap.tenant.id,
    amount: input.amount,
    reason: input.reason,
    actorUserId: bootstrap.user.id,
  })
  if (!res.success) return { success: false, error: res.error }
  revalidatePath('/settings/credits')
  return { success: true }
}
