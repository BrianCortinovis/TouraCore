import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { createServiceRoleClient } from '@touracore/db/server'
import { OnboardingWizard } from './wizard'

export const dynamic = 'force-dynamic'

export default async function AgencyOnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/agency-onboarding')

  const supabase = await createServiceRoleClient()
  const { data: existing } = await supabase
    .from('agency_memberships')
    .select('agencies(slug)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const existingSlug = (() => {
    if (!existing) return null
    const a = (existing as unknown as { agencies?: unknown }).agencies
    if (Array.isArray(a)) {
      const first = a[0] as { slug?: string } | undefined
      return first?.slug ?? null
    }
    return (a as { slug?: string } | null)?.slug ?? null
  })()

  if (existingSlug) redirect(`/a/${existingSlug}`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
            Agency Onboarding
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Crea la tua agenzia TouraCore
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Setup guidato: dati legali, billing, Stripe Connect e branding base.
          </p>
        </header>
        <OnboardingWizard userEmail={user.email} />
      </div>
    </div>
  )
}
