import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, canAccessTenant } from '@touracore/auth/visibility'

interface ClientDetailProps {
  params: Promise<{ agencySlug: string; tenantId: string }>
}

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: ClientDetailProps) {
  const { agencySlug, tenantId } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  if (!canAccessTenant(ctx, tenantId)) notFound()

  const { data: agency } = await supabase.from('agencies').select('id, name').eq('slug', agencySlug).maybeSingle()
  if (!agency) notFound()

  const { data: link } = await supabase
    .from('agency_tenant_links')
    .select('id, status, billing_mode, default_management_mode, accepted_at')
    .eq('agency_id', agency.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!link) notFound()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, billing_email, is_active, modules, created_at')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenant) notFound()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, name, kind, slug, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  const entityIds = (entities ?? []).map((e) => e.id)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  let revenueMonth = 0
  let bookings = 0
  if (entityIds.length > 0) {
    const { data: resv } = await supabase
      .from('reservations')
      .select('total_amount')
      .in('entity_id', entityIds)
      .gte('created_at', monthStart)
      .neq('status', 'cancelled')
    for (const r of resv ?? []) {
      revenueMonth += Number(r.total_amount ?? 0)
      bookings++
    }
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <nav className="text-xs text-slate-500">
        <Link href={`/a/${agencySlug}/clients`} className="hover:underline">← Clienti</Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {tenant.slug} · {link.billing_mode} · {link.default_management_mode} · {link.status}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Revenue mese" value={`€${revenueMonth.toFixed(2)}`} />
        <Kpi label="Bookings mese" value={String(bookings)} />
        <Kpi label="Strutture attive" value={String(entityIds.length)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Strutture/Entity</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(entities ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-slate-500">{e.kind} · {e.slug}</p>
              </div>
              <Link href={`/${tenant.slug}/stays/${e.slug}`} className="text-xs text-indigo-600 hover:underline">
                Apri admin →
              </Link>
            </li>
          ))}
          {(entities ?? []).length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nessuna struttura.</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Moduli attivi</h2>
        <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
{JSON.stringify(tenant.modules, null, 2)}
        </pre>
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
