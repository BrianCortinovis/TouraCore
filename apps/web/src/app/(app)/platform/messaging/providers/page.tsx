import { listProviders } from '@touracore/notifications'
import { ProviderForm } from './provider-form'
import { DeleteButton } from './delete-button'

export const dynamic = 'force-dynamic'

export default async function ProvidersPage() {
  const platformProviders = await listProviders('platform', null)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Provider credentials</h1>
        <p className="mt-1 text-sm text-slate-600">
          API key per Resend, Twilio SMS/WhatsApp, Meta WhatsApp, Slack, ecc. Encrypted AES-256-GCM at rest.
        </p>
      </header>

      <ProviderForm scope="platform" scopeId={null} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Provider platform ({platformProviders.length})
          </h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {platformProviders.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-mono text-sm font-medium">{p.provider}</p>
                <p className="text-xs text-slate-500">
                  canale: {p.channel} · from: {p.from_email ?? p.from_phone ?? '—'} · {p.is_active ? 'active' : 'disabled'}
                </p>
              </div>
              <DeleteButton id={p.id} />
            </li>
          ))}
          {platformProviders.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">Nessun provider configurato.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
