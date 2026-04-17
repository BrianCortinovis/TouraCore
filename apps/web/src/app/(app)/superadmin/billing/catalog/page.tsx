import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { ArrowLeft, Package } from 'lucide-react'

export default async function SuperadminCatalogPage() {
  const admin = await createServiceRoleClient()
  const { data: catalog } = await admin
    .from('module_catalog')
    .select('*')
    .order('order_idx', { ascending: true })

  const { data: bundles } = await admin
    .from('bundle_discounts')
    .select('*')
    .order('min_modules', { ascending: true })

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <Link
        href="/superadmin/billing"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Billing overview
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Module catalog</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestione moduli, prezzi, bundle. Sync con Stripe price IDs.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Moduli ({(catalog ?? []).length})</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Prezzo</th>
              <th className="px-4 py-3">Kind entity</th>
              <th className="px-4 py-3">Trial</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Stripe price ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {(catalog ?? []).map((m) => (
              <tr key={m.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{m.code}</td>
                <td className="px-4 py-3 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    {m.label}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  €{Number(m.base_price_eur).toFixed(2)}/mese
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.entity_kind ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.trial_days} giorni</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.active ? 'Attivo' : 'Disabilitato'}
                  </span>
                  {m.pausable && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Pausabile
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                  {m.stripe_price_id_monthly ?? 'non configurato'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Bundle discounts</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {(bundles ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-gray-900">Da {b.min_modules} moduli</span>
              <span className="font-medium text-gray-900">-{b.discount_percent}%</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {b.active ? 'Attivo' : 'Disabilitato'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
