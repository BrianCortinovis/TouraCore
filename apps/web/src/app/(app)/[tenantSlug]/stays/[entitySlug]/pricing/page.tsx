import { createServerSupabaseClient } from '@touracore/db/server'
import { PricingView } from './pricing-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function PricingPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase.from('entities').select('id, name').eq('slug', entitySlug).single()
  if (!entity) return null

  const [{ data: rules }, { data: suggestions }, { data: roomTypes }] = await Promise.all([
    supabase.from('pricing_rules').select('id, rule_type, name, config, adjustment_type, adjustment_value, priority, active, applies_to_room_types').eq('entity_id', entity.id).eq('active', true).order('priority', { ascending: false }),
    supabase.from('pricing_suggestions').select('id, room_type_id, rate_plan_id, service_date, current_price, suggested_price, confidence_pct, reason, applied').eq('entity_id', entity.id).eq('applied', false).order('service_date').limit(100),
    supabase.from('room_types').select('id, name').eq('entity_id', entity.id).eq('is_active', true),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
        <p className="text-sm text-gray-500">Regole automatiche + suggestions per ottimizzare revenue</p>
      </header>
      <PricingView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        entityId={entity.id as string}
        rules={(rules ?? []).map((r) => ({
          id: r.id as string,
          ruleType: r.rule_type as string,
          name: r.name as string,
          config: r.config as Record<string, unknown>,
          adjustmentType: r.adjustment_type as 'percent' | 'fixed',
          adjustmentValue: Number(r.adjustment_value),
          priority: r.priority as number,
        }))}
        suggestions={(suggestions ?? []).map((s) => ({
          id: s.id as string,
          roomTypeId: s.room_type_id as string,
          serviceDate: s.service_date as string,
          currentPrice: Number(s.current_price),
          suggestedPrice: Number(s.suggested_price),
          confidencePct: s.confidence_pct as number,
          reason: s.reason as string,
        }))}
        roomTypes={(roomTypes ?? []).map((rt) => ({ id: rt.id as string, name: rt.name as string }))}
      />
    </div>
  )
}
