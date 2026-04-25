import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { listRatePlans, ensureDefaultRatePlan, type Vertical } from '@touracore/billing/server'
import { RatePlansEditor, type RatePlan } from './RatePlansEditor'

interface Props {
  tenantSlug: string
  entitySlug: string
  vertical: Vertical
}

export async function RatePlansPage({ tenantSlug, entitySlug, vertical }: Props) {
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, slug, tenant_id, tenants:tenant_id(slug)')
    .eq('slug', entitySlug)
    .maybeSingle()
  if (!entity) notFound()
  const e = entity as {
    id: string
    name: string
    slug: string
    tenant_id: string
    tenants: { slug: string } | { slug: string }[] | null
  }
  const t = Array.isArray(e.tenants) ? e.tenants[0] : e.tenants
  if (!t || t.slug !== tenantSlug) notFound()

  // Auto-crea default se nessun piano
  await ensureDefaultRatePlan(e.tenant_id, e.id, vertical)
  const plans = await listRatePlans(e.id)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tariffe — {e.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configura le politiche di pagamento e cancellazione che vuoi offrire ai tuoi clienti.
        </p>
      </header>

      <RatePlansEditor
        entityId={e.id}
        vertical={vertical}
        initialPlans={plans as RatePlan[]}
      />

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
        <h3 className="font-medium text-slate-900">Cosa significano i tipi</h3>
        <ul className="mt-2 space-y-1">
          <li><strong>Cancellazione gratuita</strong> — carta salvata al booking, addebito 7gg prima del check-in. Cliente può cancellare gratis fino alla finestra impostata.</li>
          <li><strong>Acconto 30%</strong> — 30% addebitato subito + saldo addebitato 30gg prima.</li>
          <li><strong>Parzialmente rimborsabile (50%)</strong> — 50% subito + saldo 14gg prima. Rimborso parziale possibile.</li>
          <li><strong>Non rimborsabile</strong> — 100% addebitato subito con sconto. Nessun rimborso.</li>
        </ul>
      </section>
    </div>
  )
}
