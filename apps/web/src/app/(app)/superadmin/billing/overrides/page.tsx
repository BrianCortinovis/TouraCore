import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { ArrowLeft, Gift, XCircle } from 'lucide-react'

interface OverrideRow {
  id: string
  tenant_id: string
  module_code: string
  override_type: string
  override_value: number | null
  reason: string
  granted_by_scope: string
  granted_by_agency_id: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
  created_at: string
}

export default async function SuperadminOverridesPage() {
  const admin = await createServiceRoleClient()

  const { data: overrides } = await admin
    .from('module_overrides')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })

  const rows = (overrides ?? []) as OverrideRow[]

  // Fetch tenant names + agency names
  const tenantIds = [...new Set(rows.map((r) => r.tenant_id))]
  const agencyIds = [...new Set(rows.map((r) => r.granted_by_agency_id).filter(Boolean) as string[])]

  const [{ data: tenants }, { data: agencies }, { data: catalog }] = await Promise.all([
    admin.from('tenants').select('id, name, slug').in('id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000']),
    agencyIds.length
      ? admin.from('agencies').select('id, name, slug').in('id', agencyIds)
      : Promise.resolve({ data: [] }),
    admin.from('module_catalog').select('code, label, base_price_eur'),
  ])

  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t]))
  const agencyMap = new Map((agencies ?? []).map((a) => [a.id, a]))
  const catalogMap = new Map((catalog ?? []).map((c) => [c.code, c]))

  const mrrLost = rows
    .filter((r) => r.override_type === 'free')
    .reduce((s, r) => s + Number(catalogMap.get(r.module_code)?.base_price_eur ?? 0), 0)

  return (
    <div className="max-w-6xl space-y-6 p-6">
      <Link
        href="/superadmin/billing"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Billing overview
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Override moduli</h1>
        <p className="mt-1 text-sm text-gray-500">
          Free override attivi e sconti manuali concessi da super-admin o agenzie.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-500">Override attivi</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-500">MRR perso stimato (solo free)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">€{mrrLost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Concessi da agenzie</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {rows.filter((r) => r.granted_by_scope === 'agency').length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Modulo</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Concesso da</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Scadenza</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nessun override attivo.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const tenant = tenantMap.get(r.tenant_id)
                const agency = r.granted_by_agency_id ? agencyMap.get(r.granted_by_agency_id) : null
                const moduleInfo = catalogMap.get(r.module_code)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tenant?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{tenant?.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{moduleInfo?.label ?? r.module_code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.override_type === 'free'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {r.override_type === 'free' ? 'Free' : r.override_type}
                        {r.override_value != null && ` ${r.override_value}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {r.granted_by_scope === 'super_admin' ? 'Super-admin' : agency?.name ?? 'Agenzia'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.reason}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.valid_until
                        ? new Date(r.valid_until).toLocaleDateString('it-IT')
                        : 'Permanente'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/superadmin/billing/tenants/${r.tenant_id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Gestisci →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
