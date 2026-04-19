import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { connectStripeAction } from './actions'

interface Props {
  params: Promise<{ agencySlug: string }>
  searchParams: Promise<{ ok?: string; refresh?: string; error?: string }>
}

export const dynamic = 'force-dynamic'

export default async function AgencyStripePage({ params, searchParams }: Props) {
  const { agencySlug } = await params
  const sp = await searchParams
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, billing_email, stripe_connect_account_id')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const canWrite = hasPermission(ctx, 'billing.write') || ctx.isPlatformAdmin
  const connected = Boolean(agency.stripe_connect_account_id)

  return (
    <div className="space-y-4 px-6 py-6">
      <nav className="text-xs text-slate-500">
        <Link href={`/a/${agencySlug}/settings`} className="hover:underline">← Impostazioni</Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">Collegamento Stripe · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Collega il tuo account Stripe per ricevere i pagamenti delle commissioni direttamente sul tuo conto bancario.
        </p>
      </header>

      {sp.ok && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Stripe collegato con successo.
        </div>
      )}
      {sp.error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Errore durante la configurazione: {sp.error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700">Stato collegamento</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {connected ? 'Collegato' : 'Non collegato'}
          </span>
          {connected && (
            <span className="text-xs text-slate-500">
              Account: {agency.stripe_connect_account_id?.slice(0, 12)}…
            </span>
          )}
        </div>

        {canWrite && !connected && (
          <form action={connectStripeAction} className="mt-4">
            <input type="hidden" name="agencySlug" value={agencySlug} />
            <button
              type="submit"
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Avvia collegamento Stripe
            </button>
          </form>
        )}

        {canWrite && connected && (
          <form action={connectStripeAction} className="mt-4">
            <input type="hidden" name="agencySlug" value={agencySlug} />
            <input type="hidden" name="resume" value="1" />
            <button
              type="submit"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Apri dashboard Stripe
            </button>
          </form>
        )}

        {!canWrite && (
          <p className="mt-4 text-xs text-slate-500">Solo il titolare o gli amministratori possono collegare Stripe.</p>
        )}
      </section>
    </div>
  )
}
