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
    .select('id, tenant_id, status, billing_mode, default_management_mode, created_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  const tenantIds = (links ?? []).map((l) => l.tenant_id as string)
  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, name, slug, is_active').in('id', tenantIds)
    : { data: [] as { id: string; name: string; slug: string; is_active: boolean }[] }

  const canWrite = hasPermission(ctx, 'tenant.write') || ctx.isPlatformAdmin

  return (
    <div className="space-y-6 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clienti · {agency.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {links?.length ?? 0}/{agency.max_tenants ?? '∞'} tenant collegati · link con billing_mode e management_mode per cliente.
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tenant collegati</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(links ?? []).map((l) => {
            const t = tenants?.find((x) => x.id === l.tenant_id)
            return (
              <li key={l.id} className="flex items-center justify-between p-4">
                <div>
                  <Link href={`/a/${agencySlug}/clients/${l.tenant_id}`} className="font-medium text-indigo-700 hover:underline">
                    {t?.name ?? l.tenant_id.slice(0, 8)}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {t?.slug} · stato: {l.status} · billing: {l.billing_mode} · mode: {l.default_management_mode}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    l.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {l.status}
                </span>
              </li>
            )
          })}
          {(links ?? []).length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nessun cliente collegato. Usa form sopra.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
