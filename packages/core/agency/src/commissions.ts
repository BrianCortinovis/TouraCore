import { createServiceRoleClient } from '@touracore/db/server'

export type ReservationType = 'hospitality' | 'restaurant' | 'experience' | 'bike' | 'other'

export interface CommissionTier {
  threshold: number
  rate: number
}

export const DEFAULT_TIERS: Record<ReservationType, CommissionTier[]> = {
  hospitality: [
    { threshold: 0, rate: 0.10 },
    { threshold: 5000, rate: 0.12 },
    { threshold: 20000, rate: 0.15 },
  ],
  experience: [
    { threshold: 0, rate: 0.10 },
    { threshold: 5000, rate: 0.12 },
    { threshold: 20000, rate: 0.15 },
  ],
  bike: [
    { threshold: 0, rate: 0.08 },
    { threshold: 5000, rate: 0.10 },
  ],
  restaurant: [
    { threshold: 0, rate: 0.05 },
    { threshold: 5000, rate: 0.08 },
  ],
  other: [{ threshold: 0, rate: 0.10 }],
}

export function resolveCommissionRate(type: ReservationType, monthlyRevenue: number): number {
  const tiers = DEFAULT_TIERS[type] ?? DEFAULT_TIERS.other
  let rate = tiers[0]?.rate ?? 0.10
  for (const t of tiers) {
    if (monthlyRevenue >= t.threshold) rate = t.rate
  }
  return rate
}

export interface AccrueCommissionInput {
  agencyId: string
  tenantId: string
  reservationType: ReservationType
  reservationId?: string
  reservationExternalRef?: string
  grossAmount: number
  currency?: string
  metadata?: Record<string, unknown>
}

export async function accrueCommission(input: AccrueCommissionInput): Promise<{ ok: boolean; commissionId?: string; error?: string }> {
  const supabase = await createServiceRoleClient()

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthRows } = await supabase
    .from('agency_commissions')
    .select('gross_amount')
    .eq('agency_id', input.agencyId)
    .eq('reservation_type', input.reservationType)
    .gte('accrued_at', monthStart)
    .neq('status', 'reversed')

  const monthRevenue = (monthRows ?? []).reduce((sum, r) => sum + Number(r.gross_amount ?? 0), 0)
  const rate = resolveCommissionRate(input.reservationType, monthRevenue)
  const commissionAmount = Number((input.grossAmount * rate).toFixed(2))

  const { data, error } = await supabase
    .from('agency_commissions')
    .insert({
      agency_id: input.agencyId,
      tenant_id: input.tenantId,
      reservation_type: input.reservationType,
      reservation_id: input.reservationId ?? null,
      reservation_external_ref: input.reservationExternalRef ?? null,
      gross_amount: input.grossAmount,
      commission_rate: rate,
      commission_amount: commissionAmount,
      currency: input.currency ?? 'EUR',
      status: 'accrued',
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, commissionId: data.id }
}

export async function reverseCommissionForReservation(
  agencyId: string,
  reservationType: ReservationType,
  reservationId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createServiceRoleClient()
  await supabase
    .from('agency_commissions')
    .update({ status: 'reversed' })
    .eq('agency_id', agencyId)
    .eq('reservation_type', reservationType)
    .eq('reservation_id', reservationId)
    .eq('status', 'accrued')
  return { ok: true }
}
