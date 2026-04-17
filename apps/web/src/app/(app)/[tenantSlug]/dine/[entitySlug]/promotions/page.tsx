import { createServerSupabaseClient } from '@touracore/db/server'
import { PromosView } from './promos-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function PromosPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase.from('entities').select('id, name').eq('slug', entitySlug).single()
  if (!entity) return null

  const { data: promos } = await supabase
    .from('restaurant_promotions')
    .select('id, code, name, promo_type, value_pct, value_amount, valid_from, valid_to, max_uses, uses_count, active, conditions')
    .eq('restaurant_id', entity.id)
    .eq('active', true)
    .order('valid_from', { ascending: false })

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Promozioni</h1>
        <p className="text-sm text-gray-500">Early bird, happy hour, sconti, combo</p>
      </header>
      <PromosView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        promos={(promos ?? []).map((p) => ({
          id: p.id as string,
          code: p.code as string | null,
          name: p.name as string,
          promoType: p.promo_type as string,
          valuePct: p.value_pct as number | null,
          valueAmount: p.value_amount as number | null,
          validFrom: p.valid_from as string,
          validTo: p.valid_to as string,
          maxUses: p.max_uses as number | null,
          usesCount: p.uses_count as number,
        }))}
      />
    </div>
  )
}
