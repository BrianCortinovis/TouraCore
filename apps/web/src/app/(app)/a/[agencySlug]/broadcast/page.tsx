import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { BroadcastComposer } from './composer'

interface Props {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function BroadcastPage({ params }: Props) {
  const { agencySlug } = await params
  const _ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const { count: activeClientsCount } = await supabase
    .from('agency_tenant_links')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  const { data: history } = await supabase
    .from('agency_broadcasts')
    .select('id, subject, channel, recipients_count, sent_count, failed_count, status, sent_at')
    .eq('agency_id', agency.id)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .limit(20)

  return (
    <div className="space-y-5 px-6 py-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Avvisi ai clienti</h1>
          <p className="text-sm text-slate-600">
            Invia comunicazioni a tutti i clienti o a un sottoinsieme filtrato. {activeClientsCount ?? 0} clienti attivi.
          </p>
        </div>
      </header>

      <BroadcastComposer agencySlug={agencySlug} totalClients={activeClientsCount ?? 0} />

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Storico invii</h2>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Oggetto</th>
              <th className="px-3 py-2">Canale</th>
              <th className="px-3 py-2 text-right">Destinatari</th>
              <th className="px-3 py-2 text-right">Inviati</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {(history ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-500">Nessun avviso inviato ancora.</td></tr>
            )}
            {(history ?? []).map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs">{b.sent_at ? new Date(b.sent_at).toLocaleString('it-IT') : '—'}</td>
                <td className="px-3 py-2 font-medium">{b.subject}</td>
                <td className="px-3 py-2 text-xs">{channelLabel(b.channel)}</td>
                <td className="px-3 py-2 text-right">{b.recipients_count}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-emerald-700">{b.sent_count}</span>
                  {b.failed_count > 0 && <span className="text-rose-700"> / {b.failed_count} falliti</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function channelLabel(c: string): string {
  if (c === 'email') return 'Email'
  if (c === 'sms') return 'SMS'
  if (c === 'whatsapp') return 'WhatsApp'
  if (c === 'in_app') return 'In app'
  return c
}

function statusLabel(s: string): string {
  if (s === 'draft') return 'Bozza'
  if (s === 'queued') return 'In coda'
  if (s === 'sending') return 'In invio'
  if (s === 'sent') return 'Inviato'
  if (s === 'failed') return 'Fallito'
  return s
}

function statusColor(s: string): string {
  if (s === 'sent') return 'bg-emerald-100 text-emerald-800'
  if (s === 'failed') return 'bg-rose-100 text-rose-800'
  if (s === 'sending' || s === 'queued') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}
