import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { BrandingForm } from './branding-form'

interface Props {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AgencySettingsPage({ params }: Props) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, branding, white_label_domain, legal_name, billing_email, stripe_connect_account_id')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const branding = (agency.branding ?? {}) as { color?: string; logo_url?: string }

  const fiscalComplete = Boolean(agency.legal_name && agency.billing_email)
  const stripeComplete = Boolean(agency.stripe_connect_account_id)
  const brandingComplete = Boolean(branding.logo_url && branding.color)

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Impostazioni · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Completa setup fiscale, Stripe Connect e branding per sbloccare fatturazione commissioni.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <CompletionCard
          label="Setup fiscale"
          complete={fiscalComplete}
          description={fiscalComplete ? 'Ragione sociale + email OK' : 'Manca ragione sociale o email fatturazione'}
          href="#fiscal"
        />
        <CompletionCard
          label="Stripe Connect"
          complete={stripeComplete}
          description={stripeComplete ? 'Account connesso' : 'Collega per ricevere pagamenti'}
          href={`/a/${agencySlug}/settings/stripe`}
        />
        <CompletionCard
          label="Branding"
          complete={brandingComplete}
          description={brandingComplete ? 'Logo + colore OK' : 'Carica logo e scegli colore'}
          href="#branding"
        />
      </section>

      <BrandingForm
        agencySlug={agencySlug}
        initialColor={branding.color ?? '#4f46e5'}
        initialLogoUrl={branding.logo_url ?? ''}
        initialDomain={agency.white_label_domain ?? ''}
        initialLegalName={agency.legal_name ?? ''}
        initialBillingEmail={agency.billing_email ?? ''}
        canWrite={ctx.isPlatformAdmin || ctx.agencyRole === 'agency_owner' || ctx.agencyRole === 'agency_admin'}
      />
    </div>
  )
}

function CompletionCard({
  label,
  complete,
  description,
  href,
}: {
  label: string
  complete: boolean
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition-all ${
        complete
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-amber-300 bg-amber-50 hover:border-amber-400'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            complete ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          {complete ? '✓ Completo' : 'Da completare'}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </Link>
  )
}
