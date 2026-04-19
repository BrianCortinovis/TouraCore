import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  const supabase = await createServiceRoleClient()
  const { data: logs } = await supabase
    .from('notifications_log')
    .select('id, template_key, channel, recipient_email, recipient_phone, provider, provider_message_id, status, error_message, sent_at, delivered_at')
    .order('sent_at', { ascending: false })
    .limit(200)

  const { data: queue } = await supabase
    .from('notifications_queue')
    .select('id, template_key, channel, status, attempts, last_error, scheduled_at, recipient_email, recipient_phone')
    .neq('status', 'sent')
    .order('scheduled_at', { ascending: true })
    .limit(100)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Delivery logs</h1>
        <p className="mt-1 text-sm text-slate-600">Ultimi 200 invii + coda pending/failed.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Coda attiva ({queue?.length ?? 0})</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Quando</th>
                <th className="px-4 py-2">Template</th>
                <th className="px-4 py-2">Canale</th>
                <th className="px-4 py-2">Dest.</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Tentativi</th>
                <th className="px-4 py-2">Errore</th>
              </tr>
            </thead>
            <tbody>
              {(queue ?? []).map((q) => (
                <tr key={q.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-xs">{new Date(q.scheduled_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{q.template_key}</td>
                  <td className="px-4 py-2">{q.channel}</td>
                  <td className="px-4 py-2 text-xs">{q.recipient_email ?? q.recipient_phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${q.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{q.attempts}</td>
                  <td className="px-4 py-2 text-xs text-rose-600">{q.last_error ?? ''}</td>
                </tr>
              ))}
              {(queue ?? []).length === 0 && <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Coda vuota.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Logs delivery ({logs?.length ?? 0})</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Quando</th>
                <th className="px-4 py-2">Template</th>
                <th className="px-4 py-2">Canale</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Dest.</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Msg ID</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-xs">{new Date(l.sent_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.template_key}</td>
                  <td className="px-4 py-2">{l.channel}</td>
                  <td className="px-4 py-2 text-xs">{l.provider}</td>
                  <td className="px-4 py-2 text-xs">{l.recipient_email ?? l.recipient_phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      l.status === 'sent' || l.status === 'delivered' ? 'bg-emerald-100 text-emerald-800'
                      : l.status === 'bounced' || l.status === 'failed' || l.status === 'dropped' ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
                    }`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{(l.provider_message_id ?? '').slice(0, 16)}</td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Nessun log.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
