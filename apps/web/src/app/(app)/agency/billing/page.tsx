import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { Gift, Users, TrendingUp } from 'lucide-react'

export default async function AgencyBillingPage() {
  const user = await getCurrentUser()
  if (!user) notFound()

  const supabase = await createServerSupabaseClient()
  const admin = await createServiceRoleClient()

  // Identifica agency dell'utente
  const { data: agencyMember } = await supabase
    .from('agency_memberships')
    .select('agency_id, role, agency:agencies(id, name, slug, can_grant_free, free_grant_quota)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const agency = (agencyMember?.agency as unknown) as
    | { id: string; name: string; slug: string; can_grant_free: boolean; free_grant_quota: number | null }
    | null
  if (!agency) notFound()

  // Quota remaining tramite RPC
  const { data: remainingRaw } = await admin.rpc('agency_can_grant_free_remaining', {
    p_agency: agency.id,
  })
  const remaining = remainingRaw as number | null

  // Overrides concessi da questa agency
  const { data: overrides } = await admin
    .from('module_overrides')
    .select('*, tenant:tenants(name, slug)')
    .eq('granted_by_agency_id', agency.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  // Tenant clienti
  const { data: links } = await admin
    .from('agency_tenant_links')
    .select('tenant:tenants(id, name, slug)')
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  const clientTenants = (links ?? [])
    .map((l) => l.tenant as unknown as { id: string; name: string; slug: string })
    .filter(Boolean)

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing agenzia</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestisci moduli, free grant e fatture per i tuoi clienti.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-500">Clienti attivi</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{clientTenants.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-500">Free override attivi</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{(overrides ?? []).length}</p>
          <p className="mt-1 text-xs text-gray-500">
            Quota rimanente: {remaining === null ? 'illimitata' : remaining}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-gray-500">Stato permesso</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {agency.can_grant_free ? 'Attivo' : 'Bloccato'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {agency.can_grant_free
              ? 'Puoi concedere moduli gratis ai tuoi clienti'
              : 'Contatta platform admin per sbloccare'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Override attivi ({(overrides ?? []).length})
          </h3>
        </div>
        {(overrides ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nessun override attivo. Vai in un cliente per concederne uno.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(overrides ?? []).map((o) => {
              const t = (o as { tenant?: { name?: string; slug?: string } }).tenant
              return (
                <div key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{t?.name ?? '—'}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {o.module_code} · {o.override_type} · {o.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {o.valid_until
                        ? `Scade ${new Date(o.valid_until).toLocaleDateString('it-IT')}`
                        : 'Permanente'}
                    </p>
                    {t?.slug && (
                      <Link
                        href={`/agency/clients/${t.slug}/billing`}
                        className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Gestisci →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Clienti</h3>
        </div>
        {clientTenants.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nessun cliente.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {clientTenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-gray-900">{t.name}</span>
                <Link
                  href={`/agency/clients/${t.slug}/billing`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Gestisci billing →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
