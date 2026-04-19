import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, canAccessTenant } from '@touracore/auth/visibility'
import { CrmPanel } from './crm-panel'

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

  const { data: notes } = await supabase
    .from('agency_client_notes')
    .select('id, body, pinned, created_at, author_user_id')
    .eq('agency_id', agency.id)
    .eq('tenant_id', tenantId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: tasks } = await supabase
    .from('agency_client_tasks')
    .select('id, title, description, status, priority, due_date, created_at')
    .eq('agency_id', agency.id)
    .eq('tenant_id', tenantId)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(100)

  return (
    <div className="space-y-6 px-6 py-6">
      <nav className="text-xs text-slate-500">
        <Link href={`/a/${agencySlug}/clients`} className="hover:underline">← Clienti</Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {billingLabel(link.billing_mode)} · {mgmtLabel(link.default_management_mode)} · {statusLabel(link.status)}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Incassi del mese" value={EUR.format(Math.round(revenueMonth))} />
        <Kpi label="Prenotazioni del mese" value={String(bookings)} />
        <Kpi label="Attività attive" value={String(entityIds.length)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Strutture e attività</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(entities ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-slate-500">{kindLabel(e.kind)}</p>
              </div>
              <Link href={`/${tenant.slug}/stays/${e.slug}`} className="text-xs text-indigo-600 hover:underline">
                Apri gestione →
              </Link>
            </li>
          ))}
          {(entities ?? []).length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nessuna attività configurata.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Moduli attivi</h2>
        <ul className="flex flex-wrap gap-2">
          {Object.entries((tenant.modules ?? {}) as Record<string, { active: boolean }>).filter(([, v]) => v?.active).map(([code]) => (
            <li key={code} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              {moduleLabel(code)}
            </li>
          ))}
          {Object.values((tenant.modules ?? {}) as Record<string, { active: boolean }>).filter((v) => v?.active).length === 0 && (
            <li className="text-sm text-slate-500">Nessun modulo attivo.</li>
          )}
        </ul>
      </section>

      <CrmPanel
        agencySlug={agencySlug}
        tenantId={tenantId}
        notes={(notes ?? []) as unknown as Parameters<typeof CrmPanel>[0]['notes']}
        tasks={(tasks ?? []) as unknown as Parameters<typeof CrmPanel>[0]['tasks']}
      />
    </div>
  )
}

const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function statusLabel(s: string | null | undefined): string {
  if (s === 'active') return 'Attivo'
  if (s === 'pending') return 'In attesa'
  if (s === 'revoked') return 'Disattivato'
  return s ?? '—'
}

function billingLabel(b: string | null | undefined): string {
  if (b === 'client_direct') return 'Cliente paga direttamente'
  if (b === 'agency_covered') return 'Agenzia paga'
  return b ?? '—'
}

function mgmtLabel(m: string | null | undefined): string {
  if (m === 'agency_managed') return 'Gestita da agenzia'
  if (m === 'self_service') return 'Autonoma'
  return m ?? '—'
}

function kindLabel(k: string | null | undefined): string {
  const map: Record<string, string> = {
    accommodation: 'Struttura ricettiva',
    restaurant: 'Ristorazione',
    activity: 'Esperienza / Tour',
    bike_rental: 'Noleggio bike',
    moto_rental: 'Noleggio moto',
    wellness: 'Wellness / SPA',
    ski_school: 'Scuola sci',
  }
  return map[k ?? ''] ?? k ?? '—'
}

function moduleLabel(code: string): string {
  const map: Record<string, string> = {
    hospitality: 'Struttura ricettiva',
    restaurant: 'Ristorazione',
    wellness: 'Wellness / SPA',
    experiences: 'Esperienze / Tour',
    bike_rental: 'Noleggio bike',
    moto_rental: 'Noleggio moto',
    ski_school: 'Scuola sci',
  }
  return map[code] ?? code
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
