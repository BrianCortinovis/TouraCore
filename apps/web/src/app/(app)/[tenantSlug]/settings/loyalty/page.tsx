import { createServerSupabaseClient } from '@touracore/db/server'
import { LoyaltyView } from './loyalty-view'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function LoyaltyPage({ params }: Props) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: programs } = await supabase
    .from('loyalty_programs')
    .select('id, name, description, points_per_eur, active, loyalty_tiers(id, name, min_points, benefits, color_hex)')
    .eq('tenant_id', tenant.id)
    .order('created_at')

  const { data: topGuests } = await supabase
    .from('guest_loyalty')
    .select('id, points_balance, points_earned_total, last_activity_at')
    .order('points_balance', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Programma fedeltà</h1>
        <p className="text-sm text-gray-500">Tier, punti, transazioni guest</p>
      </header>
      <LoyaltyView
        tenantSlug={tenantSlug}
        programs={(programs ?? []).map((p) => ({
          id: p.id as string,
          name: p.name as string,
          description: p.description as string | null,
          pointsPerEur: Number(p.points_per_eur),
          active: p.active as boolean,
          tiers: ((p.loyalty_tiers as unknown as Array<{ id: string; name: string; min_points: number; benefits: unknown; color_hex?: string }>) ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            minPoints: t.min_points,
            benefits: Array.isArray(t.benefits) ? (t.benefits as string[]) : [],
            colorHex: t.color_hex ?? null,
          })),
        }))}
        topGuests={(topGuests ?? []).map((g) => ({
          id: g.id as string,
          pointsBalance: Number(g.points_balance),
          pointsEarnedTotal: Number(g.points_earned_total),
          lastActivityAt: g.last_activity_at as string | null,
        }))}
      />
    </div>
  )
}
