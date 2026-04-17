'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, Users, Receipt, Star, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

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

  const chartData = data.map((d) => ({ date: d.x, value: d.y }))

  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
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

  const data = [
    { name: 'Widget', value: totals.widget, color: '#3b82f6' },
    { name: 'TheFork', value: totals.thefork, color: '#f59e0b' },
    { name: 'Walk-in', value: totals.walkin, color: '#10b981' },
    { name: 'Altri', value: totals.other, color: '#9ca3af' },
  ].filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
