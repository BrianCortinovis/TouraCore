// Rate plans: tariffe selezionabili per entity (4 verticali, 4 tipi).
// Server-only (usa service role per scrittura).

import { createServiceRoleClient } from '@touracore/db/server'

export type Vertical = 'hospitality' | 'restaurant' | 'bike' | 'experience'

export type RatePlanType =
  | 'free_cancellation'
  | 'deposit_30'
  | 'partially_refundable_50'
  | 'non_refundable'

export interface RatePlan {
  id: string
  tenant_id: string
  entity_id: string
  vertical: Vertical
  type: RatePlanType
  name: string
  description: string | null
  refund_window_hours: number
  deposit_pct: number | null
  discount_pct: number | null
  charge_balance_days_before: number | null
  is_default: boolean
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export const RATE_PLAN_DEFAULTS: Record<RatePlanType, Partial<RatePlan>> = {
  free_cancellation: {
    name: 'Cancellazione gratuita',
    description: 'Cancellazione gratis fino a 7 giorni prima. Pagamento 7 giorni prima del check-in.',
    refund_window_hours: 168,
    deposit_pct: null,
    discount_pct: null,
    charge_balance_days_before: 7,
  },
  deposit_30: {
    name: 'Acconto 30%',
    description: 'Acconto del 30% al booking, saldo 30 giorni prima del check-in.',
    refund_window_hours: 720,
    deposit_pct: 30,
    discount_pct: null,
    charge_balance_days_before: 30,
  },
  partially_refundable_50: {
    name: 'Parzialmente rimborsabile',
    description: 'Acconto del 50% al booking, saldo a 14 giorni dal check-in. Rimborso 50% in caso di cancellazione.',
    refund_window_hours: 336,
    deposit_pct: 50,
    discount_pct: null,
    charge_balance_days_before: 14,
  },
  non_refundable: {
    name: 'Non rimborsabile (sconto)',
    description: 'Pagamento totale al booking, sconto applicato. Nessun rimborso in caso di cancellazione.',
    refund_window_hours: 0,
    deposit_pct: 100,
    discount_pct: 10,
    charge_balance_days_before: null,
  },
}

export async function listRatePlans(entityId: string): Promise<RatePlan[]> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('rate_plans')
    .select('*')
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return ((data ?? []) as RatePlan[])
}

export async function listActiveRatePlans(entityId: string): Promise<RatePlan[]> {
  return (await listRatePlans(entityId)).filter((rp) => rp.active)
}

export async function getDefaultRatePlan(entityId: string): Promise<RatePlan | null> {
  const all = await listActiveRatePlans(entityId)
  return all.find((rp) => rp.is_default) ?? all[0] ?? null
}

export interface UpsertRatePlanInput {
  id?: string
  tenantId: string
  entityId: string
  vertical: Vertical
  type: RatePlanType
  name?: string
  description?: string | null
  refundWindowHours?: number
  depositPct?: number | null
  discountPct?: number | null
  chargeBalanceDaysBefore?: number | null
  isDefault?: boolean
  active?: boolean
  sortOrder?: number
}

export async function upsertRatePlan(input: UpsertRatePlanInput): Promise<RatePlan> {
  const supabase = await createServiceRoleClient()
  const defaults = RATE_PLAN_DEFAULTS[input.type]
  const row = {
    id: input.id,
    tenant_id: input.tenantId,
    entity_id: input.entityId,
    vertical: input.vertical,
    type: input.type,
    name: input.name ?? defaults.name ?? input.type,
    description: input.description ?? defaults.description ?? null,
    refund_window_hours: input.refundWindowHours ?? defaults.refund_window_hours ?? 168,
    deposit_pct: input.depositPct ?? defaults.deposit_pct ?? null,
    discount_pct: input.discountPct ?? defaults.discount_pct ?? null,
    charge_balance_days_before: input.chargeBalanceDaysBefore ?? defaults.charge_balance_days_before ?? null,
    is_default: input.isDefault ?? false,
    active: input.active ?? true,
    sort_order: input.sortOrder ?? 0,
  }

  if (row.is_default) {
    await supabase
      .from('rate_plans')
      .update({ is_default: false })
      .eq('entity_id', input.entityId)
      .neq('id', row.id ?? '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await supabase
    .from('rate_plans')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single()
  if (error) throw error
  return data as RatePlan
}

export async function deleteRatePlan(id: string): Promise<void> {
  const supabase = await createServiceRoleClient()
  await supabase.from('rate_plans').delete().eq('id', id)
}

export async function ensureDefaultRatePlan(
  tenantId: string,
  entityId: string,
  vertical: Vertical,
): Promise<RatePlan | null> {
  const supabase = await createServiceRoleClient()
  const { data: existing } = await supabase
    .from('rate_plans')
    .select('id')
    .eq('entity_id', entityId)
    .limit(1)
    .maybeSingle()
  if (existing) return null

  return upsertRatePlan({
    tenantId,
    entityId,
    vertical,
    type: 'free_cancellation',
    isDefault: true,
    active: true,
    sortOrder: 0,
  })
}
