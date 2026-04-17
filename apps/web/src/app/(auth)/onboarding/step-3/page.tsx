import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import Step3Form from './step-3-form'

export default async function OnboardingStep3() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/step-2')
  }

  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('slug, modules')
    .eq('id', tenantId)
    .single()

  const modules = (tenant?.modules ?? {}) as Record<string, { active: boolean; source: string }>
  const activeCodes = Object.keys(modules).filter((k) => modules[k]?.active)

  // Se hospitality non è tra moduli attivi, redirect al creation hub (F10) con preselezione primo modulo
  // Per ora MVP: se c'è hospitality uso step-3 classico accommodation; altrimenti skippa.
  const hasHospitality = activeCodes.includes('hospitality')

  if (!hasHospitality && activeCodes.length > 0 && tenant?.slug) {
    // TODO F10: creation hub kind-aware. Per ora skip diretto a dashboard.
    redirect(`/${tenant.slug}`)
  }

  return (
    <Suspense>
      <Step3Form />
    </Suspense>
  )
}
