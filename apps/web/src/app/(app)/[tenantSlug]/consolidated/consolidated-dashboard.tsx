'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { TrendingUp, Building, UtensilsCrossed, FileText, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'

interface KpiDaily {
  serviceDate: string
  revenueHospitality: number; revenueRestaurant: number; revenueTotal: number
  bookingsHospitality: number; ordersRestaurant: number; entitiesActive: number
}

interface EntityRow { entityId: string; name: string; kind: string; revenue: number; txCount: number }

interface DocRow {
  vertical: string; documentType: string; month: string
  documentsCount: number; totalRevenue: number; paidAmount: number; unpaidAmount: number
}

interface Props {
  tenantSlug: string
  fromDate: string; toDate: string
  kpiDaily: KpiDaily[]; byEntity: EntityRow[]; docsRevenue: DocRow[]
}

export function ConsolidatedDashboard(props: Props) {
  const { fromDate, toDate, kpiDaily, byEntity, docsRevenue } = props
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totals = kpiDaily.reduce(
    (acc, k) => {
      acc.hospitality += k.revenueHospitality
      acc.restaurant += k.revenueRestaurant
      acc.total += k.revenueTotal
      acc.bookings += k.bookingsHospitality
      acc.orders += k.ordersRestaurant
      return acc
    },
    { hospitality: 0, restaurant: 0, total: 0, bookings: 0, orders: 0 },
  )

  const totalUnpaid = docsRevenue.reduce((s, d) => s + d.unpaidAmount, 0)
  const totalPaid = docsRevenue.reduce((s, d) => s + d.paidAmount, 0)

  function setRange(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from); params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
  }

  function preset(daysAgo: number) {
    const to = new Date().toISOString().slice(0, 10)
    const fromD = new Date()
    fromD.setDate(fromD.getDate() - daysAgo)
    setRange(fromD.toISOString().slice(0, 10), to)
  }

  // Trend data
  const trendData = kpiDaily.map((k) => ({
    date: k.serviceDate,
    Ricettivo: k.revenueHospitality,
    Ristorazione: k.revenueRestaurant,
    Totale: k.revenueTotal,
  }))

  // Entity bar data
  const entityBarData = byEntity.sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((e) => ({
    name: e.name.slice(0, 20),
    revenue: e.revenue,
    kind: e.kind,
  }))

  // Pie data per vertical
  const pieData = [
    { name: 'Ricettivo', value: totals.hospitality, color: '#3b82f6' },
    { name: 'Ristorazione', value: totals.restaurant, color: '#f59e0b' },
  ].filter((d) => d.value > 0)

  return (
    <>
      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <input type="date" value={fromDate} onChange={(e) => setRange(e.target.value, toDate)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"/>
        <span className="text-gray-400">→</span>
        <input type="date" value={toDate} onChange={(e) => setRange(fromDate, e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"/>
        <button onClick={() => preset(7)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">7gg</button>
        <button onClick={() => preset(30)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">30gg</button>
        <button onClick={() => preset(90)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">90gg</button>
        <button onClick={() => preset(365)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">1y</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600"/>
            <p className="text-xs text-gray-500">Revenue totale</p>
          </div>
          <p className="mt-2 text-2xl font-bold">€ {totals.total.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600"/>
            <p className="text-xs text-gray-500">Ricettivo</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">€ {totals.hospitality.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{totals.bookings} prenotazioni</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-600"/>
            <p className="text-xs text-gray-500">Ristorazione</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">€ {totals.restaurant.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{totals.orders} ordini</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600"/>
            <p className="text-xs text-gray-500">Fatturato emesso</p>
          </div>
          <p className="mt-2 text-2xl font-bold">€ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600"/>
            <p className="text-xs text-gray-500">Insoluti</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">€ {totalUnpaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Trend chart */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Trend revenue cross-vertical</h2>
        {trendData.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Nessun dato per il periodo</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
              <YAxis tick={{ fontSize: 10 }}/>
              <Tooltip/>
              <Legend/>
              <Line type="monotone" dataKey="Ricettivo" stroke="#3b82f6" strokeWidth={2}/>
              <Line type="monotone" dataKey="Ristorazione" stroke="#f59e0b" strokeWidth={2}/>
              <Line type="monotone" dataKey="Totale" stroke="#10b981" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Entity ranking */}
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Top entity per revenue</h2>
          {entityBarData.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Nessun dato</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={entityBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis type="number" tick={{ fontSize: 10 }}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100}/>
                <Tooltip/>
                <Bar dataKey="revenue" fill="#3b82f6"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Vertical mix */}
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Mix vertical</h2>
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Nessun dato</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* Documents revenue summary */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Fatturazione mensile (per documents unified)</h2>
        </div>
        {docsRevenue.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">Nessuna fattura</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Mese</th>
                <th className="px-4 py-2 text-left">Vertical</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">N°</th>
                <th className="px-4 py-2 text-right">Totale</th>
                <th className="px-4 py-2 text-right">Pagato</th>
                <th className="px-4 py-2 text-right">Insoluto</th>
              </tr>
            </thead>
            <tbody>
              {docsRevenue.slice(0, 20).map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-xs">{d.month.slice(0, 7)}</td>
                  <td className="px-4 py-2 text-xs">{d.vertical}</td>
                  <td className="px-4 py-2 text-xs">{d.documentType}</td>
                  <td className="px-4 py-2 text-right">{d.documentsCount}</td>
                  <td className="px-4 py-2 text-right font-medium">€ {d.totalRevenue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-green-600">€ {d.paidAmount.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-red-600">€ {d.unpaidAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
