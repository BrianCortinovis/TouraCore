import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Bike, Plus, Zap } from 'lucide-react'
import { Badge } from '@touracore/ui'
import { listBikes, BIKE_TYPE_META, BIKE_STATUS_COLOR } from '@touracore/bike-rental'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ status?: string; type?: string; q?: string }>
}

export default async function FleetList({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const bikes = await listBikes({
    bikeRentalId: entity.id as string,
    status: sp.status as never,
    bikeType: sp.type as never,
    search: sp.q,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flotta</h1>
          <p className="mt-1 text-sm text-gray-500">
            {bikes.length} bici totali · gestione per-seriale con tracking e-bike
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/rides/${entitySlug}/fleet/new`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuova bici
        </Link>
      </div>

      {bikes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Bike className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna bici</h3>
          <p className="mt-2 text-sm text-gray-500">Aggiungi la prima bici alla flotta.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Marca/Modello</th>
                <th className="px-4 py-3 text-left">Taglia</th>
                <th className="px-4 py-3 text-left">Serial</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-left">Batteria</th>
                <th className="px-4 py-3 text-left">Condizione</th>
                <th className="px-4 py-3 text-left">KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bikes.map((b) => {
                const meta = BIKE_TYPE_META[b.bike_type]
                const statusColor = BIKE_STATUS_COLOR[b.status] ?? 'gray'
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/${tenantSlug}/rides/${entitySlug}/fleet/${b.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span>{meta?.icon ?? '🚲'}</span>
                        <span>{meta?.label ?? b.bike_type}</span>
                        {b.is_electric && <Zap className="h-3 w-3 text-amber-500" />}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {[b.brand, b.model].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{b.frame_size ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.serial_number ?? '—'}</td>
                    <td className="px-4 py-2">
                      <StatusPill status={b.status} color={statusColor} />
                    </td>
                    <td className="px-4 py-2">
                      {b.is_electric ? (
                        <span className="text-xs">
                          {b.last_charge_pct ?? '—'}% · {b.battery_health_pct}% health
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-xs">
                        {b.condition_grade}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{b.total_km.toFixed(0)} km</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    gray: 'bg-gray-100 text-gray-700',
    orange: 'bg-orange-100 text-orange-800',
  }
  const klass = colors[color] ?? colors.gray
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${klass}`}>
      {status}
    </span>
  )
}
