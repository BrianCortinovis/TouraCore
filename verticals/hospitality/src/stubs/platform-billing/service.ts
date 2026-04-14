import { createServerSupabaseClient } from '@touracore/db'

// Percentuali commissione piattaforma per piano
const PLAN_COMMISSION_RATES: Record<string, number> = {
  trial: 0,
  starter: 3.0,
  professional: 2.0,
  enterprise: 1.5,
}

interface PlatformChargeParams {
  organizationId: string
  reservationId: string
  reservationCode: string
  totalAmount: number
  status: string
  source: string
  createdAt: string
}

export async function processPlatformChargeForReservation(
  params: PlatformChargeParams
): Promise<void> {
  // Calcola commissione solo su prenotazioni confermate o checked_out
  if (!['confirmed', 'checked_in', 'checked_out'].includes(params.status)) return
  if (params.totalAmount <= 0) return

  const supabase = await createServerSupabaseClient()

  // Verifica se esiste già una commissione per questa prenotazione
  const { count: existing } = await supabase
    .from('commission_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('reservation_id', params.reservationId)
    .eq('type', 'booking_commission')

  if (existing && existing > 0) return

  // Recupera entity e tenant per determinare il piano
  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', params.organizationId)
    .single()

  if (!entity) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('tenant_id', entity.tenant_id)
    .single()

  const plan = subscription?.plan ?? 'trial'
  const commissionRate = PLAN_COMMISSION_RATES[plan] ?? 0

  if (commissionRate <= 0) return

  const commissionAmount = Math.round(params.totalAmount * commissionRate) / 100

  await supabase.from('commission_ledger').insert({
    tenant_id: entity.tenant_id,
    reservation_id: params.reservationId,
    type: 'booking_commission',
    amount: commissionAmount,
    currency: 'EUR',
    status: 'pending',
    description: `Commissione ${commissionRate}% su ${params.reservationCode} (${params.totalAmount} EUR)`,
  })
}

export async function getCommissionSummary(tenantId: string): Promise<{
  totalPending: number
  totalCompleted: number
  entries: Array<{
    id: string
    reservation_id: string | null
    type: string
    amount: number
    status: string
    description: string | null
    created_at: string
  }>
}> {
  const supabase = await createServerSupabaseClient()

  const { data: entries, error } = await supabase
    .from('commission_ledger')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  let totalPending = 0
  let totalCompleted = 0

  for (const entry of entries ?? []) {
    if (entry.status === 'pending') totalPending += Number(entry.amount)
    if (entry.status === 'completed') totalCompleted += Number(entry.amount)
  }

  return {
    totalPending: Math.round(totalPending * 100) / 100,
    totalCompleted: Math.round(totalCompleted * 100) / 100,
    entries: (entries ?? []).map((e) => ({
      id: e.id as string,
      reservation_id: e.reservation_id as string | null,
      type: e.type as string,
      amount: Number(e.amount),
      status: e.status as string,
      description: e.description as string | null,
      created_at: e.created_at as string,
    })),
  }
}
