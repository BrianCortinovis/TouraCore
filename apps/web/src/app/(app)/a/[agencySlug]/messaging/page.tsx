import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { listProviders } from '@touracore/notifications'
import { AgencyProviderForm } from './provider-form'
import { AgencyDeleteButton } from './delete-button'

interface Props {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AgencyMessagingPage({ params }: Props) {
  const { agencySlug } = await params
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id, name').eq('slug', agencySlug).maybeSingle()
  if (!agency) notFound()

  const providers = await listProviders('agency', agency.id)

  const { data: logs } = await supabase
    .from('notifications_log')
    .select('id, template_key, channel, recipient_email, recipient_phone, provider, status, sent_at')
    .eq('agency_id', agency.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Messaging · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configura provider per inviare email/SMS/WhatsApp con branding proprio. Override template platform.
        </p>
      </header>

      <AgencyProviderForm agencyId={agency.id} agencySlug={agencySlug} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Provider configurati ({providers.length})</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-mono text-sm font-medium">{p.provider}</p>
                <p className="text-xs text-slate-500">{p.channel} · from: {p.from_email ?? p.from_phone ?? '—'}</p>
              </div>
              <AgencyDeleteButton id={p.id} agencySlug={agencySlug} />
            </li>
          ))}
          {providers.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nessun provider. Usa platform fallback.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ultimi 50 invii</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Quando</th>
                <th className="px-4 py-2">Template</th>
                <th className="px-4 py-2">Canale</th>
                <th className="px-4 py-2">Destinatario</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-xs">{new Date(l.sent_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.template_key}</td>
                  <td className="px-4 py-2">{l.channel}</td>
                  <td className="px-4 py-2 text-xs">{l.recipient_email ?? l.recipient_phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      l.status === 'sent' || l.status === 'delivered' ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">Nessun invio.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
