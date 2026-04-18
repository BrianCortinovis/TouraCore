import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function SlotsInventoryPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: products } = await supabase
    .from('experience_products')
    .select('id, name')
    .eq('entity_id', entity.id)
  const productIds = (products ?? []).map((p: { id: string }) => p.id)

  const now = new Date().toISOString()
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString()

  const { data: timeslots } = productIds.length > 0
    ? await supabase
      .from('experience_timeslots')
      .select('id, product_id, start_at, end_at, capacity_total, capacity_booked, capacity_held, status')
      .in('product_id', productIds)
      .gte('start_at', now)
      .lte('start_at', in30)
      .order('start_at')
    : { data: [] }

  const rows = (timeslots ?? []) as Array<{ id: string; product_id: string; start_at: string; end_at: string; capacity_total: number; capacity_booked: number; capacity_held: number; status: string }>
  const productMap = new Map((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Slot inventory</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">Nessuno slot nei prossimi 30 giorni. Genera da schedule.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Prodotto</th>
                <th className="px-3 py-2 text-left font-semibold">Start</th>
                <th className="px-3 py-2 text-left font-semibold">End</th>
                <th className="px-3 py-2 text-right font-semibold">Cap</th>
                <th className="px-3 py-2 text-right font-semibold">Booked</th>
                <th className="px-3 py-2 text-right font-semibold">Held</th>
                <th className="px-3 py-2 text-right font-semibold">Avail</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((t) => {
                const avail = t.capacity_total - t.capacity_booked - t.capacity_held
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">{productMap.get(t.product_id) ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{new Date(t.start_at).toLocaleString('it-IT')}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(t.end_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2 text-right">{t.capacity_total}</td>
                    <td className="px-3 py-2 text-right">{t.capacity_booked}</td>
                    <td className="px-3 py-2 text-right">{t.capacity_held}</td>
                    <td className={`px-3 py-2 text-right font-medium ${avail === 0 ? 'text-red-600' : 'text-green-600'}`}>{avail}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${t.status === 'open' ? 'bg-green-100 text-green-700' : t.status === 'full' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                    </td>
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
