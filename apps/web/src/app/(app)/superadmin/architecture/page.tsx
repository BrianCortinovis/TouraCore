import { LayoutGrid, Layers3, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { MetricCard, SectionCard, StatusBadge } from '../_components'
import { SHARED_CORE_MODULES, SUITE_VERTICALS, type SuperadminModule } from '../_lib'

function toneForStatus(status: SuperadminModule['status']) {
  if (status === 'live') return 'emerald' as const
  if (status === 'ready') return 'blue' as const
  return 'amber' as const
}

export default async function SuperadminArchitecturePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            <LayoutGrid className="h-3.5 w-3.5" />
            Architecture
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Shared core, vertical modules, per-structure settings
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Questa è la visione della suite: un core condiviso, moduli verticali indipendenti e
            ogni struttura con i propri settings. Nessuna categoria rigida tra tipi di struttura.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Shared modules" value={`${SHARED_CORE_MODULES.length}`} hint="Capabilities comuni" icon={Layers3} tone="violet" />
        <MetricCard label="Vertical CMS" value={`${SUITE_VERTICALS.length}`} hint="Famiglie applicative" icon={Workflow} tone="blue" />
        <MetricCard label="Live verticals" value={`${SUITE_VERTICALS.filter((v) => v.status === 'live').length}`} hint="Già operative" icon={ShieldCheck} tone="emerald" />
        <MetricCard label="Ready verticals" value={`${SUITE_VERTICALS.filter((v) => v.status === 'ready').length}`} hint="Pronte al rollout" icon={Sparkles} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SectionCard
          title="Shared core modules"
          description="Quello che deve restare uguale in tutta la suite."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SHARED_CORE_MODULES.map((module) => (
              <div key={module} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{module}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Operating model"
          description="Il flusso gerarchico che deve restare identico in tutti i CMS."
        >
          <div className="space-y-3">
            {[
              ['Platform', 'superadmin, billing, deploy, governance'],
              ['Agency', 'multi-tenant management, client routing'],
              ['Tenant', 'subscription, settings, permissions'],
              ['Entity', 'rooms, services, reservations, staff'],
              ['Booking session', 'public checkout, extras, payment'],
            ].map(([label, description]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Vertical roadmap"
        description="I CMS verticali da far vivere sullo stesso core, ciascuno con la sua UX e i suoi settings."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SUITE_VERTICALS.map((vertical) => (
            <div key={vertical.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{vertical.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{vertical.description}</p>
                </div>
                <StatusBadge tone={toneForStatus(vertical.status)}>
                  {vertical.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Implementation principles"
        description="Regole che non dobbiamo rompere mentre aggiungiamo nuovi CMS."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            'Zero fallback globali per i dati tenant-scoped',
            'Ogni struttura ha i suoi settings reali',
            'Shared core, UX verticale separata',
            'Mapping canali e OTA come layer canonico',
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
