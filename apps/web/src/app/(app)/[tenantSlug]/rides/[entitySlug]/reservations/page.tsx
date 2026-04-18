import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { listReservations, RESERVATION_STATUS_COLOR } from '@touracore/bike-rental'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function ReservationsList({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const reservations = await listReservations({
    bikeRentalId: entity.id as string,
    status: sp.status as never,
    search: sp.q,
    limit: 50,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
        <p className="mt-1 text-sm text-gray-500">{reservations.length} prenotazioni · hourly-slot booking</p>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna prenotazione</h3>
          <p className="mt-2 text-sm text-gray-500">
            Le prenotazioni compariranno qui non appena arriveranno dal booking engine o dai channel OTA.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Rif</th>
                <th className="px-4 py-3 text-left">Ospite</th>
                <th className="px-4 py-3 text-left">Pickup</th>
                <th className="px-4 py-3 text-left">Return</th>
                <th className="px-4 py-3 text-left">Durata</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-left">Sorgente</th>
                <th className="px-4 py-3 text-right">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.map((r) => {
                const statusColor = RESERVATION_STATUS_COLOR[r.status] ?? 'gray'
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{r.reference_code}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{r.guest_name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{r.guest_email ?? ''}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {format(new Date(r.rental_start), 'dd MMM HH:mm', { locale: it })}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {format(new Date(r.rental_end), 'dd MMM HH:mm', { locale: it })}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{r.duration_hours}h</td>
                    <td className="px-4 py-2">
                      <StatusPill status={r.status} color={statusColor} />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.source}</td>
                    <td className="px-4 py-2 text-right font-semibold">€{Number(r.total_amount).toFixed(2)}</td>
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${klass}`}>{status}</span>
  )
}
