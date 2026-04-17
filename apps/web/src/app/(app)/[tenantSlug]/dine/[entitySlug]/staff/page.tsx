import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { StaffView } from './staff-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function StaffPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [{ data: staff }, { data: shifts }, { data: pools }] = await Promise.all([
    supabase
      .from('restaurant_staff')
      .select('id, full_name, role, pin_code, hourly_rate')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('staff_shifts')
      .select('id, staff_id, start_at, end_at, role, status')
      .eq('restaurant_id', entity.id)
      .gte('start_at', weekStart.toISOString())
      .lt('start_at', weekEnd.toISOString())
      .order('start_at'),
    supabase
      .from('tip_pools')
      .select('id, period_start, period_end, total_amount, status, rule_type')
      .eq('restaurant_id', entity.id)
      .order('period_start', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Staff & Turni</h1>
        <p className="text-sm text-gray-500">Personale, shift settimana, clock-in/out, tip pool</p>
      </header>
      <StaffView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        staff={(staff ?? []).map((s) => ({
          id: s.id as string,
          fullName: s.full_name as string,
          role: s.role as string,
          pinCode: s.pin_code as string | null,
          hourlyRate: s.hourly_rate ? Number(s.hourly_rate) : null,
        }))}
        shifts={(shifts ?? []).map((s) => ({
          id: s.id as string,
          staffId: s.staff_id as string,
          startAt: s.start_at as string,
          endAt: s.end_at as string,
          role: s.role as string,
          status: s.status as string,
        }))}
        pools={(pools ?? []).map((p) => ({
          id: p.id as string,
          periodStart: p.period_start as string,
          periodEnd: p.period_end as string,
          totalAmount: Number(p.total_amount),
          status: p.status as string,
          ruleType: p.rule_type as string,
        }))}
        weekStart={weekStart.toISOString().slice(0, 10)}
      />
    </div>
  )
}
