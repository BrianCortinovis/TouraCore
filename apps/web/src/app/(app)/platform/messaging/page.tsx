import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function PlatformMessagingPage() {
  const supabase = await createServiceRoleClient()
  const [{ count: templates }, { count: providers }, { count: queue }, { count: logs }] = await Promise.all([
    supabase.from('notification_templates').select('id', { count: 'exact', head: true }),
    supabase.from('notification_providers').select('id', { count: 'exact', head: true }),
    supabase.from('notifications_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('notifications_log').select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Messaging</h1>
        <p className="mt-1 text-sm text-slate-600">Provider, template, coda, logs di delivery.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi label="Template" value={templates ?? 0} />
        <Kpi label="Provider configurati" value={providers ?? 0} />
        <Kpi label="Coda pending" value={queue ?? 0} />
        <Kpi label="Log totale" value={logs ?? 0} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card href="/platform/messaging/providers" title="Provider credentials" desc="Email/SMS/WhatsApp/Slack/Push keys encrypted per scope" />
        <Card href="/platform/messaging/templates" title="Template library" desc="23 template default + override agency/tenant, multilingua" />
        <Card href="/platform/messaging/logs" title="Delivery logs" desc="Sent/delivered/bounced/opened tracking + provider_message_id" />
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </Link>
  )
}
