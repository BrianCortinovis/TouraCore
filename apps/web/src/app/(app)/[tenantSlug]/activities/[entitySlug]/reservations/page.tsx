import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function ReservationsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: reservations } = await supabase
    .from('experience_reservations')
    .select('id, reference_code, customer_name, customer_email, start_at, guests_count, total_cents, currency, status, payment_status, source, product_id, experience_products(name)')
    .eq('entity_id', entity.id)
    .order('start_at', { ascending: false })
    .limit(100)

  const rows = (reservations ?? []) as Array<{ id: string; reference_code: string; customer_name: string; customer_email: string | null; start_at: string; guests_count: number; total_cents: number; currency: string; status: string; payment_status: string; source: string; product_id: string; experience_products: { name: string } | Array<{ name: string }> | null }>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">Nessuna prenotazione.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Ref</th>
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold">Prodotto</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-right font-semibold">Ospiti</th>
                <th className="px-3 py-2 text-right font-semibold">Totale</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => {
                const prod = Array.isArray(r.experience_products) ? r.experience_products[0] : r.experience_products
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs">{r.reference_code}</td>
                    <td className="px-3 py-2">{r.customer_name}<br /><span className="text-xs text-gray-500">{r.customer_email}</span></td>
                    <td className="px-3 py-2 text-xs">{prod?.name}</td>
                    <td className="px-3 py-2 text-xs">{new Date(r.start_at).toLocaleString('it-IT')}</td>
                    <td className="px-3 py-2 text-right">{r.guests_count}</td>
                    <td className="px-3 py-2 text-right font-medium">€{(r.total_cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : r.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.source}</td>
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
