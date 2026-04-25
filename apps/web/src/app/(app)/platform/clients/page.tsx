import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function PlatformClientsPage() {
  const supabase = await createServiceRoleClient()

  // Tenant con almeno un link agenzia attivo
  const { data: linkedTenantLinks } = await supabase
    .from('agency_tenant_links')
    .select('tenant_id')
    .eq('status', 'active')
  const linkedIds = [...new Set((linkedTenantLinks ?? []).map((l) => l.tenant_id as string))]

  // Tutti i tenant escluso __system__ e quelli già sotto un'agenzia
  let query = supabase
    .from('tenants')
    .select('id, name, slug, is_active, modules, created_at, billing_email')
    .neq('slug', '__system__')
    .order('created_at', { ascending: false })

  if (linkedIds.length > 0) {
    query = query.not('id', 'in', `(${linkedIds.join(',')})`)
  }

  const { data: tenants } = await query

  // Billing profiles tenant-wide per questi tenant
  const tenantIds = (tenants ?? []).map((t) => t.id)
  const billingMap: Record<string, { billing_model: string; subscription_price_eur: number | null; commission_percent: number | null }> = {}
  if (tenantIds.length > 0) {
    const { data: profiles } = await supabase
      .from('billing_profiles')
      .select('scope_id, billing_model, subscription_price_eur, commission_percent')
      .eq('scope', 'tenant')
      .is('module_code', null)
      .in('scope_id', tenantIds)
    for (const p of profiles ?? []) {
      billingMap[p.scope_id] = p
    }
  }

  const activeCount = (tenants ?? []).filter((t) => t.is_active).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Clienti diretti</h1>
        <p className="mt-1 text-sm text-slate-600">
          {tenants?.length ?? 0} account non collegati ad agenzie · {activeCount} attivi · gestisci billing e moduli.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Moduli attivi</th>
                <th className="px-4 py-2">Billing</th>
                <th className="px-4 py-2">Stato</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((t) => {
                const billing = billingMap[t.id]
                const activeModules = Object.entries(
                  (t.modules ?? {}) as Record<string, { active: boolean }>
                ).filter(([, v]) => v?.active).map(([k]) => k)

                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {activeModules.length > 0
                          ? activeModules.map((m) => (
                              <span key={m} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                {m}
                              </span>
                            ))
                          : <span className="text-xs text-slate-400">nessuno</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {billing ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          billing.billing_model === 'free' ? 'bg-slate-100 text-slate-500' :
                          billing.billing_model === 'subscription' ? 'bg-blue-50 text-blue-700' :
                          billing.billing_model === 'commission' ? 'bg-amber-50 text-amber-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {billing.billing_model}
                          {billing.subscription_price_eur ? ` €${billing.subscription_price_eur}/mese` : ''}
                          {billing.commission_percent ? ` ${billing.commission_percent}%` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">default</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {t.is_active ? 'attivo' : 'sospeso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/platform/clients/${t.id}`}
                        className="text-xs font-medium text-indigo-600 hover:underline">
                        Gestisci →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(tenants ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    Nessun cliente diretto. Tutti i tenant sono gestiti da agenzie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
