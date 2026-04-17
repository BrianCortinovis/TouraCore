'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { z } from 'zod'

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

const ProgramSchema = z.object({
  tenantSlug: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  pointsPerEur: z.number().min(0.01).max(100).default(1),
})

export async function createLoyaltyProgram(input: z.infer<typeof ProgramSchema>) {
  const parsed = ProgramSchema.parse(input)
  const { tenantId } = await assertOwnsTenant(parsed.tenantSlug)
  const admin = await createServiceRoleClient()
  const { data, error } = await admin.from('loyalty_programs').insert({
    tenant_id: tenantId,
    name: parsed.name,
    description: parsed.description ?? null,
    points_per_eur: parsed.pointsPerEur,
  }).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath(`/${parsed.tenantSlug}/settings/loyalty`)
  return { programId: data.id as string }
}

const TierSchema = z.object({
  programId: z.string().uuid(),
  tenantSlug: z.string(),
  name: z.string().min(1).max(40),
  minPoints: z.number().int().min(0),
  benefits: z.array(z.string()).default([]),
  colorHex: z.string().optional(),
  orderIdx: z.number().int().default(0),
})

export async function createLoyaltyTier(input: z.infer<typeof TierSchema>) {
  const parsed = TierSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data: prog } = await admin.from('loyalty_programs').select('tenant_id, tenants(slug)').eq('id', parsed.programId).single()
  if (!prog) throw new Error('Program not found')
  await assertOwnsTenant(parsed.tenantSlug)

  await admin.from('loyalty_tiers').insert({
    program_id: parsed.programId,
    name: parsed.name,
    min_points: parsed.minPoints,
    benefits: parsed.benefits,
    color_hex: parsed.colorHex ?? null,
    order_idx: parsed.orderIdx,
  })
  revalidatePath(`/${parsed.tenantSlug}/settings/loyalty`)
}

const AdjustSchema = z.object({
  guestLoyaltyId: z.string().uuid(),
  tenantSlug: z.string(),
  points: z.number().int(),
  notes: z.string().optional(),
  transactionType: z.enum(['earn','redeem','adjust','expire']).default('adjust'),
})

export async function adjustGuestPoints(input: z.infer<typeof AdjustSchema>) {
  const parsed = AdjustSchema.parse(input)
  await assertOwnsTenant(parsed.tenantSlug)
  const admin = await createServiceRoleClient()

  const { data: gl } = await admin.from('guest_loyalty').select('points_balance, points_earned_total, points_redeemed_total').eq('id', parsed.guestLoyaltyId).single()
  if (!gl) throw new Error('Guest loyalty not found')

  const update: Record<string, unknown> = {
    points_balance: Number(gl.points_balance) + parsed.points,
    last_activity_at: new Date().toISOString(),
  }
  if (parsed.transactionType === 'earn') update.points_earned_total = Number(gl.points_earned_total) + Math.abs(parsed.points)
  if (parsed.transactionType === 'redeem') update.points_redeemed_total = Number(gl.points_redeemed_total) + Math.abs(parsed.points)

  await admin.from('guest_loyalty').update(update).eq('id', parsed.guestLoyaltyId)
  await admin.from('loyalty_transactions').insert({
    guest_loyalty_id: parsed.guestLoyaltyId,
    transaction_type: parsed.transactionType,
    points: parsed.points,
    notes: parsed.notes ?? null,
  })

  revalidatePath(`/${parsed.tenantSlug}/settings/loyalty`)
}
