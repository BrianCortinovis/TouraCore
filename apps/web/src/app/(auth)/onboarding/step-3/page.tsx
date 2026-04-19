import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import Step3Form from './step-3-form'

const KIND_BY_MODULE: Record<string, string> = {
  hospitality: 'accommodation',
  restaurant: 'restaurant',
  bike_rental: 'bike',
  moto_rental: 'moto',
  experiences: 'experience',
  wellness: 'wellness',
  ski_school: 'ski',
}

const MODULE_ORDER = ['hospitality', 'restaurant', 'bike_rental', 'moto_rental', 'experiences', 'wellness', 'ski_school']

export default async function OnboardingStep3() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()

  if (!user) redirect('/login')

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

  // Primary module = first active in MODULE_ORDER
  const primary = MODULE_ORDER.find((code) => activeCodes.includes(code))

  if (!primary) {
    if (tenant?.slug) redirect(`/${tenant.slug}`)
    redirect('/onboarding/step-modules')
  }

  // Hospitality → legacy Step3Form (accommodation)
  if (primary === 'hospitality') {
    return (
      <Suspense>
        <Step3Form />
      </Suspense>
    )
  }

  // Other verticals → kind-aware sub-route
  const kind = KIND_BY_MODULE[primary] ?? 'accommodation'
  redirect(`/onboarding/step-3/${kind}`)
}
