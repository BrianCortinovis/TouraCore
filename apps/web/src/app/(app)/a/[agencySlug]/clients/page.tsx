import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { LinkClientForm } from './link-form'
import { InviteClientForm } from './invite-form'

interface ClientsPageProps {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function ClientsPage({ params }: ClientsPageProps) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, max_tenants')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const { data: links } = await supabase
    .from('agency_tenant_links')
    .select('id, tenant_id, status, billing_mode, default_management_mode, invited_at')
    .eq('agency_id', agency.id)
    .order('invited_at', { ascending: false })

  const tenantIds = (links ?? []).map((l) => l.tenant_id as string)
  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, name, slug, is_active').in('id', tenantIds)
    : { data: [] as { id: string; name: string; slug: string; is_active: boolean }[] }

  const canWrite = hasPermission(ctx, 'tenant.write') || ctx.isPlatformAdmin

  function statusLabel(s: string | null | undefined): string {
    switch (s) {
      case 'active': return 'Attivo'
      case 'pending': return 'In attesa'
      case 'revoked': return 'Disattivato'
      default: return s ?? '—'
    }
  }

  function billingLabel(b: string | null | undefined): string {
    switch (b) {
      case 'client_direct': return 'Cliente paga direttamente'
      case 'agency_covered': return 'Agenzia paga'
      default: return b ?? '—'
    }
  }

  function mgmtLabel(m: string | null | undefined): string {
    switch (m) {
      case 'agency_managed': return 'Gestita da agenzia'
      case 'self_service': return 'Autonoma'
      default: return m ?? '—'
    }
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clienti · {agency.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {links?.length ?? 0}/{agency.max_tenants ?? '∞'} clienti collegati · configura fatturazione e modalità di gestione per ciascun cliente.
          </p>
        </div>
      </header>

      {canWrite && (
        <div className="space-y-4">
          <InviteClientForm agencySlug={agencySlug} />
          <LinkClientForm agencySlug={agencySlug} />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Clienti collegati</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(links ?? []).map((l) => {
            const t = tenants?.find((x) => x.id === l.tenant_id)
            return (
              <li key={l.id} className="flex items-center justify-between p-4">
                <div>
                  <Link href={`/a/${agencySlug}/clients/${l.tenant_id}`} className="font-medium text-indigo-700 hover:underline">
                    {t?.name ?? 'Cliente senza nome'}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {statusLabel(l.status)} · Fatturazione: {billingLabel(l.billing_mode)} · Gestione: {mgmtLabel(l.default_management_mode)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    l.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusLabel(l.status)}
                </span>
              </li>
            )
          })}
          {(links ?? []).length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nessun cliente collegato. Usa il form in alto per invitare o collegare un cliente.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
