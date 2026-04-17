import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { AnalyticsDashboard } from './analytics-dashboard'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const { from, to } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const today = new Date()
  const defaultFrom = new Date(today)
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const fromDate = from ?? defaultFrom.toISOString().slice(0, 10)
  const toDate = to ?? today.toISOString().slice(0, 10)

  const [{ data: kpiDaily }, { data: resKpi }, { data: menuEng }] = await Promise.all([
    supabase
      .from('v_restaurant_kpi_daily')
      .select('*')
      .eq('restaurant_id', entity.id)
      .gte('service_date', fromDate)
      .lte('service_date', toDate)
      .order('service_date'),
    supabase
      .from('v_restaurant_reservation_kpi')
      .select('*')
      .eq('restaurant_id', entity.id)
      .gte('slot_date', fromDate)
      .lte('slot_date', toDate)
      .order('slot_date'),
    supabase
      .from('v_menu_engineering')
      .select('*')
      .eq('restaurant_id', entity.id)
      .order('units_sold', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Covers, ADR F&B, turn rate, menu engineering Kasavana-Smith</p>
      </header>
      <AnalyticsDashboard
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        fromDate={fromDate}
        toDate={toDate}
        kpiDaily={(kpiDaily ?? []).map((k) => ({
          serviceDate: k.service_date as string,
          ordersCount: Number(k.orders_count),
          covers: Number(k.covers),
          revenue: Number(k.revenue),
          avgPerCover: Number(k.avg_per_cover),
          avgTicket: Number(k.avg_ticket),
          voidedCount: Number(k.voided_count),
        }))}
        resKpi={(resKpi ?? []).map((r) => ({
          slotDate: r.slot_date as string,
          reservationsTotal: Number(r.reservations_total),
          noShowCount: Number(r.no_show_count),
          confirmedCount: Number(r.confirmed_count),
          coversSeated: Number(r.covers_seated),
          coversBooked: Number(r.covers_booked),
          avgTurnMinutesActual: Number(r.avg_turn_minutes_actual),
          bookingsWidget: Number(r.bookings_widget),
          bookingsThefork: Number(r.bookings_thefork),
          bookingsWalkin: Number(r.bookings_walkin),
        }))}
        menuItems={(menuEng ?? []).map((m) => ({
          itemId: m.item_id as string,
          name: m.name as string,
          priceBase: Number(m.price_base),
          unitsSold: Number(m.units_sold),
          revenue: Number(m.revenue),
          popularityPct: Number(m.popularity_pct),
          marginPct: Number(m.margin_pct),
        }))}
      />
    </div>
  )
}
