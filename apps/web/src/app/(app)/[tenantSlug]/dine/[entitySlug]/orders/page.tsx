import { createServerSupabaseClient } from '@touracore/db/server'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const { entitySlug } = await params
  const { filter } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  const filterStatus = filter ?? 'all'
  let query = supabase
    .from('restaurant_orders')
    .select('id, table_id, status, payment_method, payment_status, total, party_size, opened_at, closed_at')
    .eq('restaurant_id', entity.id)
    .order('opened_at', { ascending: false })
    .limit(100)

  if (filterStatus === 'open') query = query.in('status', ['open', 'sent'])
  else if (filterStatus === 'closed') query = query.eq('status', 'closed')
  else if (filterStatus === 'voided') query = query.eq('status', 'voided')

  const { data: orders } = await query

  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('id, code')
    .eq('restaurant_id', entity.id)

  const tableMap = new Map((tables ?? []).map((t) => [t.id as string, t.code as string]))

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Ordini</h1>
        <p className="text-sm text-gray-500">Storico ordini POS</p>
      </header>

      <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-2">
        {['all', 'open', 'closed', 'voided'].map((f) => (
          <a
            key={f}
            href={`?filter=${f}`}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filterStatus === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'Tutti' : f === 'open' ? 'Aperti' : f === 'closed' ? 'Chiusi' : 'Annullati'}
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Apertura</th>
              <th className="px-4 py-2 text-left">Tavolo</th>
              <th className="px-4 py-2 text-left">Coperti</th>
              <th className="px-4 py-2 text-left">Stato</th>
              <th className="px-4 py-2 text-left">Pagamento</th>
              <th className="px-4 py-2 text-right">Totale</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id as string} className="border-t border-gray-100">
                <td className="px-4 py-2 text-xs">
                  {new Date(o.opened_at as string).toLocaleString('it-IT')}
                </td>
                <td className="px-4 py-2 font-medium">
                  {o.table_id ? tableMap.get(o.table_id as string) ?? '—' : '—'}
                </td>
                <td className="px-4 py-2">{o.party_size as number}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${
                      o.status === 'closed'
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : o.status === 'sent'
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : o.status === 'voided'
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-gray-300 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {o.status as string}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">{(o.payment_method as string) ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">€ {Number(o.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
