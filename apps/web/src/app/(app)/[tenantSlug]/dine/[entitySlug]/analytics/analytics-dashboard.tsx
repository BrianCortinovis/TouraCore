'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, Users, Receipt, Star, AlertCircle } from 'lucide-react'

interface KpiDaily {
  serviceDate: string
  ordersCount: number
  covers: number
  revenue: number
  avgPerCover: number
  avgTicket: number
  voidedCount: number
}

interface ResKpi {
  slotDate: string
  reservationsTotal: number
  noShowCount: number
  confirmedCount: number
  coversSeated: number
  coversBooked: number
  avgTurnMinutesActual: number
  bookingsWidget: number
  bookingsThefork: number
  bookingsWalkin: number
}

interface MenuItem {
  itemId: string
  name: string
  priceBase: number
  unitsSold: number
  revenue: number
  popularityPct: number
  marginPct: number
}

interface Props {
  tenantSlug: string
  entitySlug: string
  fromDate: string
  toDate: string
  kpiDaily: KpiDaily[]
  resKpi: ResKpi[]
  menuItems: MenuItem[]
}

export function AnalyticsDashboard(props: Props) {
  const { kpiDaily, resKpi, menuItems, fromDate, toDate } = props
  const router = useRouter()
  const pathname = usePathname()

  const totals = useMemo(() => {
    const totalRevenue = kpiDaily.reduce((s, k) => s + k.revenue, 0)
    const totalCovers = kpiDaily.reduce((s, k) => s + k.covers, 0)
    const totalOrders = kpiDaily.reduce((s, k) => s + k.ordersCount, 0)
    const totalNoShow = resKpi.reduce((s, r) => s + r.noShowCount, 0)
    const totalReservations = resKpi.reduce((s, r) => s + r.reservationsTotal, 0)
    const noShowRate = totalReservations > 0 ? (totalNoShow / totalReservations) * 100 : 0
    return {
      totalRevenue,
      totalCovers,
      totalOrders,
      avgPerCover: totalCovers > 0 ? totalRevenue / totalCovers : 0,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      noShowRate,
    }
  }, [kpiDaily, resKpi])

  // Menu engineering quadrants (Kasavana-Smith)
  const popularityThreshold = 1 / Math.max(menuItems.length, 1)
  const marginThreshold = menuItems.reduce((s, m) => s + m.marginPct, 0) / Math.max(menuItems.length, 1)

  const stars = menuItems.filter((m) => m.popularityPct >= popularityThreshold && m.marginPct >= marginThreshold)
  const plowhorses = menuItems.filter((m) => m.popularityPct >= popularityThreshold && m.marginPct < marginThreshold)
  const puzzles = menuItems.filter((m) => m.popularityPct < popularityThreshold && m.marginPct >= marginThreshold)
  const dogs = menuItems.filter((m) => m.popularityPct < popularityThreshold && m.marginPct < marginThreshold)

  function setRange(from: string, to: string) {
    router.push(`${pathname}?from=${from}&to=${to}`)
  }

  function presetRange(daysAgo: number) {
    const to = new Date().toISOString().slice(0, 10)
    const fromD = new Date()
    fromD.setDate(fromD.getDate() - daysAgo)
    setRange(fromD.toISOString().slice(0, 10), to)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setRange(e.target.value, toDate)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <span className="text-gray-400">→</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setRange(fromDate, e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button onClick={() => presetRange(7)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">7gg</button>
        <button onClick={() => presetRange(30)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">30gg</button>
        <button onClick={() => presetRange(90)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">90gg</button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" value={`€ ${totals.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="text-green-600" />
        <KpiCard label="Coperti totali" value={String(totals.totalCovers)} icon={Users} color="text-blue-600" />
        <KpiCard label="ADR per coperto" value={`€ ${totals.avgPerCover.toFixed(2)}`} icon={Receipt} color="text-purple-600" />
        <KpiCard label="No-show rate" value={`${totals.noShowRate.toFixed(1)}%`} icon={AlertCircle} color="text-red-600" />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Trend giornaliero</h2>
        <SimpleSparkline data={kpiDaily.map((k) => ({ x: k.serviceDate, y: k.revenue }))} label="Revenue €" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" /> Menu Engineering Kasavana-Smith
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Quadrant title="⭐ Stars" subtitle="Alta popolarità + alto margine" items={stars} color="bg-green-50 border-green-300" />
            <Quadrant title="🐎 Plowhorses" subtitle="Alta popolarità + basso margine" items={plowhorses} color="bg-blue-50 border-blue-300" />
            <Quadrant title="🧩 Puzzles" subtitle="Bassa popolarità + alto margine" items={puzzles} color="bg-amber-50 border-amber-300" />
            <Quadrant title="🐕 Dogs" subtitle="Bassa popolarità + basso margine" items={dogs} color="bg-red-50 border-red-300" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Source mix prenotazioni</h2>
          <SourceMixChart resKpi={resKpi} />
        </div>
      </section>
    </>
  )
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof TrendingUp; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function SimpleSparkline({ data, label }: { data: Array<{ x: string; y: number }>; label: string }) {
  if (data.length === 0) return <p className="text-center text-xs text-gray-400">Nessun dato</p>

  const maxY = Math.max(...data.map((d) => d.y), 1)
  const w = 800
  const h = 120
  const stepX = w / Math.max(data.length - 1, 1)

  const points = data.map((d, i) => `${i * stepX},${h - (d.y / maxY) * h}`).join(' ')

  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">{label} · max € {maxY.toFixed(2)}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
        {data.map((d, i) => (
          <circle key={i} cx={i * stepX} cy={h - (d.y / maxY) * h} r="3" fill="#3b82f6" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.x}</span>
        <span>{data[data.length - 1]?.x}</span>
      </div>
    </div>
  )
}

function Quadrant({ title, subtitle, items, color }: { title: string; subtitle: string; items: MenuItem[]; color: string }) {
  return (
    <div className={`rounded border ${color} p-2`}>
      <p className="font-bold">{title}</p>
      <p className="text-[10px] text-gray-600">{subtitle}</p>
      <p className="mt-1 text-lg font-bold">{items.length}</p>
      <ul className="mt-1 max-h-20 overflow-y-auto text-[10px]">
        {items.slice(0, 5).map((i) => (
          <li key={i.itemId} className="truncate">
            {i.name} <span className="text-gray-400">· {i.unitsSold}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourceMixChart({ resKpi }: { resKpi: ResKpi[] }) {
  const totals = resKpi.reduce(
    (acc, r) => {
      acc.widget += r.bookingsWidget
      acc.thefork += r.bookingsThefork
      acc.walkin += r.bookingsWalkin
      acc.other += r.reservationsTotal - r.bookingsWidget - r.bookingsThefork - r.bookingsWalkin
      return acc
    },
    { widget: 0, thefork: 0, walkin: 0, other: 0 },
  )
  const total = totals.widget + totals.thefork + totals.walkin + totals.other
  if (total === 0) return <p className="text-center text-xs text-gray-400">Nessun dato</p>

  const sources = [
    { label: 'Widget', value: totals.widget, color: 'bg-blue-500' },
    { label: 'TheFork', value: totals.thefork, color: 'bg-amber-500' },
    { label: 'Walk-in', value: totals.walkin, color: 'bg-green-500' },
    { label: 'Altri', value: totals.other, color: 'bg-gray-400' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex h-8 overflow-hidden rounded">
        {sources.map((s, i) => (
          <div
            key={i}
            className={s.color}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {sources.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded ${s.color}`} />
            <span>{s.label}: <strong>{s.value}</strong> ({((s.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
