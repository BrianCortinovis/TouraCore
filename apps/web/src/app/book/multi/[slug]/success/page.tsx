import { createServiceRoleClient } from '@touracore/db/server'
import { CheckCircle2, FileText, Mail } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ bundle?: string }>
}

export default async function BundleSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { bundle: bundleId } = await searchParams
  const supabase = await createServiceRoleClient()

  let bundle: { id: string; total_amount_cents: number; status: string } | null = null
  let items: Array<{ id: string; item_type: string; config: any; total_cents: number }> = []

  if (bundleId) {
    const { data: b } = await supabase
      .from('reservation_bundles')
      .select('id, total_amount_cents, status')
      .eq('id', bundleId)
      .single()
    bundle = b as any

    const { data: i } = await supabase
      .from('reservation_bundle_items')
      .select('id, item_type, config, total_cents')
      .eq('bundle_id', bundleId)
      .order('sort_order')
    items = (i ?? []) as any
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Prenotazione confermata</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Grazie! Riceverai a breve email di conferma con documenti fiscali.
          </p>
        </div>

        {bundle && (
          <>
            <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">ID prenotazione</p>
              <p className="mt-1 font-mono text-sm text-gray-900">{bundle.id}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Stato</p>
              <p className="mt-1 text-sm">{bundle.status}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Totale pagato</p>
              <p className="mt-1 text-lg font-bold text-gray-900">€{(bundle.total_amount_cents / 100).toFixed(2)}</p>
            </div>

            {items.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-100 rounded border border-gray-200">
                {items.map((i) => (
                  <li key={i.id} className="p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-900">{i.item_type}</span>
                      <span className="font-semibold">€{(i.total_cents / 100).toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="mt-6 space-y-2">
          <div className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Email di conferma inviata. Controlla la casella.</div>
          </div>
          <div className="flex items-start gap-2 rounded border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Ogni servizio genera documento fiscale dedicato (ricevuta/fattura/scontrino) dell'emittente corretto.</div>
          </div>
        </div>

        <Link href={`/book/multi/${slug}`} className="mt-6 block text-center text-sm text-blue-600 hover:underline">
          ← Torna alla prenotazione
        </Link>
      </div>
    </div>
  )
}
