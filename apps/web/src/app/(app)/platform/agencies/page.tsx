import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

function planLabel(p: string | null | undefined): string {
  if (p === 'agency_starter') return 'Starter'
  if (p === 'agency_pro') return 'Pro'
  if (p === 'agency_enterprise') return 'Enterprise'
  if (p === 'custom') return 'Personalizzato'
  return p ?? '—'
}

export default async function PlatformAgenciesPage() {
  const supabase = await createServiceRoleClient()
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, slug, plan, max_tenants, is_active, stripe_connect_account_id, stripe_subscription_id, created_at')
    .order('created_at', { ascending: false })

  const { data: links } = await supabase
    .from('agency_tenant_links')
    .select('agency_id, status')
    .eq('status', 'active')
  const tenantCount = new Map<string, number>()
  for (const l of links ?? []) {
    tenantCount.set(l.agency_id, (tenantCount.get(l.agency_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Agenzie</h1>
        <p className="mt-1 text-sm text-slate-600">
          {agencies?.length ?? 0} totali · gestisci creazione, sospensione e accesso per conto di.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">URL</th>
                <th className="px-4 py-2">Piano</th>
                <th className="px-4 py-2 text-right">Clienti</th>
                <th className="px-4 py-2">Pagamenti</th>
                <th className="px-4 py-2">Stato</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(agencies ?? []).map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">/a/{a.slug}</td>
                  <td className="px-4 py-2">{planLabel(a.plan)}</td>
                  <td className="px-4 py-2 text-right">{tenantCount.get(a.id) ?? 0}/{a.max_tenants ?? '∞'}</td>
                  <td className="px-4 py-2 text-xs">
                    {a.stripe_connect_account_id ? 'Collegato' : '—'}
                    {a.stripe_subscription_id ? ' · Abbonamento attivo' : ''}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${a.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {a.is_active ? 'Attiva' : 'Sospesa'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/platform/agencies/${a.id}`} className="text-xs text-indigo-600 hover:underline">
                      Dettagli →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
