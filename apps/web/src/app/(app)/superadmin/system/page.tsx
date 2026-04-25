import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import {
  Activity,
  ExternalLink,
  Gauge,
  Server,
  Shield,
  Sparkles,
} from 'lucide-react'
import { MetricCard, SectionCard, StatusBadge } from '../_components'
import { inferSupabaseProjectRef, maskEnvValue } from '../_lib'

function envStatus(value: string | undefined | null) {
  return value ? 'connected' : 'missing'
}

export default async function SuperadminSystemPage() {
  const supabase = await createServiceRoleClient()

  const [
    { count: adminCount },
    { count: auditCount },
    { count: integrationCount },
    { count: channelCount },
  ] = await Promise.all([
    supabase.from('platform_admins').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('integration_credentials').select('id', { count: 'exact', head: true }),
    supabase.from('channel_connections').select('id', { count: 'exact', head: true }),
  ])

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? null
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  const supabaseProjectRef = inferSupabaseProjectRef(supabaseUrl)

  const controls = [
    { label: 'Service role client', value: 'available', tone: 'emerald' as const },
    { label: 'RLS contract', value: 'entity / tenant scoped', tone: 'blue' as const },
    { label: 'Audit trail', value: `${auditCount ?? 0} entries`, tone: 'violet' as const },
    { label: 'Platform admins', value: `${adminCount ?? 0}`, tone: 'amber' as const },
  ]

  const readiness = [
    { label: 'Supabase URL', value: envStatus(supabaseUrl) },
    { label: 'App URL', value: envStatus(appUrl) },
    { label: 'Integrations', value: integrationCount ? 'ready' : 'review' },
    { label: 'Channel engine', value: channelCount ? 'ready' : 'review' },
    { label: 'Environment', value: vercelEnv },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Server className="h-3.5 w-3.5" />
              Piattaforma
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Supabase Pro + Vercel Pro control panel
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Controllo operativo della piattaforma: progetto, runtime, esposizione pubblica,
              ambiente, controlli di sicurezza e readiness dei servizi core.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={supabaseUrl ? 'emerald' : 'rose'}>
              {supabaseUrl ? 'Supabase connected' : 'Supabase missing'}
            </StatusBadge>
            <StatusBadge tone={appUrl ? 'emerald' : 'amber'}>
              {appUrl ? 'Vercel app url set' : 'App url missing'}
            </StatusBadge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Platform admins" value={`${adminCount ?? 0}`} hint="Livello superadmin" icon={Shield} tone="blue" />
        <MetricCard label="Audit logs" value={`${auditCount ?? 0}`} hint="Registro immutabile" icon={Activity} tone="violet" />
        <MetricCard label="Integrations" value={`${integrationCount ?? 0}`} hint="Credenziali e scope" icon={Sparkles} tone="amber" />
        <MetricCard label="Channel engines" value={`${channelCount ?? 0}`} hint="Connessioni OTA / direct" icon={Gauge} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Runtime & deployment" description="Valori d'ambiente e punti di accesso della piattaforma.">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Supabase URL</span>
              <span className="font-mono text-slate-800">{maskEnvValue(supabaseUrl)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Supabase project ref</span>
              <span className="font-mono text-slate-800">{supabaseProjectRef ?? 'n/d'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">App URL</span>
              <span className="font-mono text-slate-800">{maskEnvValue(appUrl)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Runtime</span>
              <span className="font-mono text-slate-800">{vercelEnv}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {supabaseProjectRef ? (
              <Link
                href={`https://supabase.com/dashboard/project/${supabaseProjectRef}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Supabase
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open Vercel
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Production controls" description="Controlli base che devono restare sempre attivi.">
          <div className="space-y-3">
            {controls.map((control) => (
              <div key={control.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{control.label}</span>
                <StatusBadge tone={control.tone}>{control.value}</StatusBadge>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Security posture</p>
            <p className="mt-1 leading-6">
              CSRF, headers sicuri, RLS, service role only per operazioni di piattaforma, audit
              append-only e scope isolation tra platform, agency, tenant ed entity.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Platform readiness checklist"
        description="Stato sintetico della piattaforma per produzione e supporto multi-CMS."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {readiness.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
