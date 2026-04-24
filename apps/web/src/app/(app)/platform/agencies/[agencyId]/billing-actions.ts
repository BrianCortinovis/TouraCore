'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

async function assertPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function saveAgencyPlatformBillingAction(input: {
  agencyId: string
  billingModel: 'subscription' | 'commission' | 'hybrid' | 'free'
  feeMonthlyEur?: number | null
  commissionPct?: number | null
  commissionBase?: 'client_revenue' | 'agency_fee'
  commissionCapMonthlyEur?: number | null
  commissionMinMonthlyEur?: number | null
  commissionThresholdEur?: number | null
  notes?: string | null
  validFrom?: string | null
  validUntil?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Non autenticato' }
  if (!(await assertPlatformAdmin(user.id))) return { ok: false, error: 'Permessi insufficienti' }

  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', input.agencyId)
    .maybeSingle()
  if (!agency) return { ok: false, error: 'Agenzia non trovata' }

  const payload = {
    agency_id: input.agencyId,
    billing_model: input.billingModel,
    fee_monthly_eur: input.feeMonthlyEur ?? null,
    commission_pct: input.commissionPct ?? null,
    commission_base: input.commissionBase ?? 'client_revenue',
    commission_cap_monthly_eur: input.commissionCapMonthlyEur ?? null,
    commission_min_monthly_eur: input.commissionMinMonthlyEur ?? null,
    commission_threshold_eur: input.commissionThresholdEur ?? null,
    notes: input.notes ?? null,
    set_by_user_id: user.id,
    valid_from: input.validFrom ?? new Date().toISOString().slice(0, 10),
    valid_until: input.validUntil ?? null,
  }

  const { error } = await supabase
    .from('agency_platform_billing')
    .upsert(payload, { onConflict: 'agency_id' })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/platform/agencies/${input.agencyId}`)
  return { ok: true }
}
