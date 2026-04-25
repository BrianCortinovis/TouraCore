import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import {
  connectStripeTenantAction,
  refreshStripeStatusAction,
  openStripeDashboardAction,
} from './actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

interface TenantRow {
  id: string
  slug: string
  name: string
  stripe_connect_account_id: string | null
  stripe_connect_charges_enabled: boolean
  stripe_connect_payouts_enabled: boolean
  stripe_connect_details_submitted: boolean
  stripe_connect_country: string | null
  stripe_connect_requirements: { currently_due?: string[]; eventually_due?: string[]; disabled_reason?: string | null } | null
  stripe_connect_updated_at: string | null
}

const ERROR_LABELS: Record<string, string> = {
  forbidden: 'Permessi insufficienti.',
  tenant_not_found: 'Tenant non trovato.',
  stripe_not_configured: 'Stripe non configurato in piattaforma.',
  stripe_account_failed: 'Errore creazione account Stripe.',
  stripe_link_failed: 'Errore generazione link onboarding.',
  no_account: 'Nessun account Stripe collegato.',
  fetch_failed: 'Errore lettura stato Stripe.',
  dashboard_failed: 'Errore apertura dashboard Stripe.',
}

export default async function PaymentsSettingsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params
  const sp = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      id, slug, name,
      stripe_connect_account_id,
      stripe_connect_charges_enabled,
      stripe_connect_payouts_enabled,
      stripe_connect_details_submitted,
      stripe_connect_country,
      stripe_connect_requirements,
      stripe_connect_updated_at
    `)
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) notFound()
  const t = tenant as TenantRow

  const connected = Boolean(t.stripe_connect_account_id)
  const ready = t.stripe_connect_charges_enabled && t.stripe_connect_payouts_enabled
  const submitted = t.stripe_connect_details_submitted

  const errorLabel = sp.error ? ERROR_LABELS[sp.error] ?? sp.error : null
  const successMsg = sp.ok === '1' ? 'Onboarding completato. Verifica lo stato.' : sp.refreshed === '1' ? 'Stato aggiornato.' : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pagamenti</h1>
        <p className="mt-1 text-sm text-slate-500">
          Collega il tuo conto bancario tramite Stripe per ricevere i pagamenti delle prenotazioni
          direttamente. TouraCore preleva solo la commissione, i fondi arrivano sul tuo IBAN
          tramite bonifico SEPA automatico.
        </p>
      </header>

      {errorLabel && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorLabel}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium">Stato Stripe Connect</h2>
            <p className="mt-1 text-xs text-slate-500">
              {!connected && 'Non ancora collegato.'}
              {connected && !submitted && 'Onboarding non completato.'}
              {submitted && !ready && 'Onboarding completato, in verifica Stripe.'}
              {ready && 'Operativo. Puoi pubblicare strutture e accettare pagamenti.'}
            </p>
          </div>
          <StatusBadge ready={ready} submitted={submitted} connected={connected} />
        </div>

        {connected && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt className="text-slate-500">Account ID</dt>
            <dd className="font-mono text-slate-700">{t.stripe_connect_account_id?.slice(0, 18)}…</dd>

            <dt className="text-slate-500">Paese</dt>
            <dd className="text-slate-700">{t.stripe_connect_country ?? '—'}</dd>

            <dt className="text-slate-500">Accetta pagamenti</dt>
            <dd className={t.stripe_connect_charges_enabled ? 'text-emerald-700' : 'text-slate-400'}>
              {t.stripe_connect_charges_enabled ? 'Sì' : 'No'}
            </dd>

            <dt className="text-slate-500">Bonifici attivi</dt>
            <dd className={t.stripe_connect_payouts_enabled ? 'text-emerald-700' : 'text-slate-400'}>
              {t.stripe_connect_payouts_enabled ? 'Sì' : 'No'}
            </dd>

            <dt className="text-slate-500">Ultimo refresh</dt>
            <dd className="text-slate-700">
              {t.stripe_connect_updated_at
                ? new Date(t.stripe_connect_updated_at).toLocaleString('it-IT')
                : '—'}
            </dd>
          </dl>
        )}

        {t.stripe_connect_requirements?.currently_due && t.stripe_connect_requirements.currently_due.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium">Stripe richiede ancora:</p>
            <ul className="mt-1 list-disc pl-5">
              {t.stripe_connect_requirements.currently_due.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={connectStripeTenantAction}>
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {connected ? (ready ? 'Aggiorna onboarding' : 'Riprendi onboarding') : 'Collega Stripe'}
            </button>
          </form>

          {connected && (
            <>
              <form action={refreshStripeStatusAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Aggiorna stato
                </button>
              </form>
              <form action={openStripeDashboardAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Apri dashboard Stripe
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <h3 className="font-medium text-slate-900">Come funziona</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Collega Stripe una sola volta (5 minuti, KYC + IBAN).</li>
          <li>Quando un cliente prenota, paga direttamente sul tuo conto Stripe.</li>
          <li>TouraCore trattiene solo la commissione concordata.</li>
          <li>Stripe bonifica i fondi sul tuo IBAN automaticamente (giornaliero).</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Senza onboarding completato non puoi pubblicare strutture o ricevere prenotazioni.
        </p>
      </section>
    </div>
  )
}

function StatusBadge({
  ready,
  submitted,
  connected,
}: {
  ready: boolean
  submitted: boolean
  connected: boolean
}) {
  if (ready) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Operativo</span>
  }
  if (submitted) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">In verifica</span>
  }
  if (connected) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Da completare</span>
  }
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Non collegato</span>
}
