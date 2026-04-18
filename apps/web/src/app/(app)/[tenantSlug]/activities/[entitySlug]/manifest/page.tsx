import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function ManifestPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const sp = await searchParams
  const date = sp.date ?? new Date().toISOString().slice(0, 10)
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id, name').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const { data: manifest } = await supabase
    .from('experience_manifest_view')
    .select('*')
    .eq('entity_id', entity.id)
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)
    .order('start_at')

  const rows = (manifest ?? []) as Array<{
    reservation_id: string; reference_code: string; customer_name: string; customer_phone: string | null
    start_at: string; end_at: string; guests_count: number; status: string
    product_name: string; meeting_point: string | null; pickup_address: string | null
    guests: Array<{ first_name: string; last_name: string; waiver_signed: boolean; checked_in: boolean; qr: string }> | null
  }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manifest giornaliero</h1>
          <p className="text-sm text-gray-500 mt-1">{entity.name} · {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            <input name="date" type="date" defaultValue={date} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
          </form>
          <button onClick={() => { if (typeof window !== 'undefined') window.print() }} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">Stampa</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">Nessuna prenotazione per {date}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.reservation_id} className="rounded-lg border border-gray-200 bg-white p-5 print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{r.product_name}</p>
                  <p className="text-xl font-bold text-gray-900">{new Date(r.start_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-gray-500">{r.reference_code}</p>
                  <p className="text-sm font-medium">{r.customer_name}</p>
                  {r.customer_phone && <p className="text-xs text-gray-500">{r.customer_phone}</p>}
                </div>
              </div>
              {(r.meeting_point || r.pickup_address) && (
                <p className="mt-2 text-xs text-gray-600">
                  {r.pickup_address ? `Pickup: ${r.pickup_address}` : `Meeting point: ${r.meeting_point}`}
                </p>
              )}
              {r.guests && (
                <table className="mt-3 w-full text-xs">
                  <thead className="text-gray-500 text-left">
                    <tr><th className="py-1">Ospite</th><th>Waiver</th><th>Check-in</th><th>QR</th></tr>
                  </thead>
                  <tbody>
                    {r.guests.map((g, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1">{g.first_name} {g.last_name}</td>
                        <td>{g.waiver_signed ? '✅' : '❌'}</td>
                        <td>{g.checked_in ? '✅' : '—'}</td>
                        <td className="font-mono text-[10px] text-gray-400">{g.qr?.slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
