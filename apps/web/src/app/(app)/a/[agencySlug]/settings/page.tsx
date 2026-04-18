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
    .select('id, name, slug, branding, white_label_domain, legal_name, billing_email')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const branding = (agency.branding ?? {}) as { color?: string; logo_url?: string }

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Impostazioni · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Branding white-label, dominio custom (CNAME), dati legali.
        </p>
      </header>

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
