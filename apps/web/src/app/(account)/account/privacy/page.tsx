import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { createServerSupabaseClient } from '@touracore/db/server'
import { PrivacyActions } from './PrivacyActions'

export const dynamic = 'force-dynamic'

export default async function AccountPrivacyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/account/privacy')

  const supabase = await createServerSupabaseClient()

  const { data: deletion } = await supabase
    .from('user_deletion_requests')
    .select('scheduled_hard_delete_at, canceled_at, hard_deleted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: dsarHistory } = await supabase
    .from('dsar_requests')
    .select('id, request_type, status, requested_at, completed_at')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(20)

  const { data: consents } = await supabase
    .from('cookie_consent_records')
    .select('preferences, policy_version, created_at, is_reconsent')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const pendingDeletion = deletion && !deletion.canceled_at && !deletion.hard_deleted_at

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Privacy e dati personali</h1>
        <p className="text-gray-600 mt-1">
          Esercita i tuoi diritti ai sensi degli artt. 15-22 GDPR.
        </p>
      </header>

      {pendingDeletion && (
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Cancellazione account in attesa</h2>
          <p className="text-amber-800 text-sm mt-1">
            Il tuo account sarà cancellato definitivamente il{' '}
            <strong>{new Date(deletion.scheduled_hard_delete_at).toLocaleDateString('it-IT')}</strong>.
            Puoi annullare la richiesta di seguito.
          </p>
        </div>
      )}

      <PrivacyActions
        userId={user.id}
        userEmail={user.email ?? ''}
        hasPendingDeletion={!!pendingDeletion}
      />

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Storico richieste DSAR</h2>
        {dsarHistory && dsarHistory.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="py-2">Tipo</th>
                <th className="py-2">Status</th>
                <th className="py-2">Richiesta</th>
                <th className="py-2">Completata</th>
              </tr>
            </thead>
            <tbody>
              {dsarHistory.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{d.request_type}</td>
                  <td className="py-2">
                    <span className={
                      d.status === 'completed' ? 'text-green-700' :
                      d.status === 'failed' ? 'text-red-700' :
                      'text-gray-600'
                    }>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{new Date(d.requested_at).toLocaleString('it-IT')}</td>
                  <td className="py-2 text-gray-500">
                    {d.completed_at ? new Date(d.completed_at).toLocaleString('it-IT') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Nessuna richiesta precedente.</p>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Storico consensi cookie</h2>
        {consents && consents.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {consents.map((c, i) => {
              const p = c.preferences as { analytics?: boolean; marketing?: boolean }
              return (
                <li key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="text-gray-600">{new Date(c.created_at).toLocaleString('it-IT')}</span>
                  <span className="font-mono text-xs">
                    analytics: {p?.analytics ? '✓' : '✗'} · marketing: {p?.marketing ? '✓' : '✗'}
                    {c.is_reconsent && <span className="ml-2 text-amber-600">re-consent</span>}
                    <span className="ml-2 text-gray-400">v{c.policy_version?.slice(0, 8)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nessun consenso registrato.</p>
        )}
      </section>

      <section className="text-sm text-gray-500">
        Per domande: <a href="mailto:dpo@touracore.com" className="text-blue-600 hover:underline">dpo@touracore.com</a>.
        Vedi anche{' '}
        <a href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
      </section>
    </div>
  )
}
