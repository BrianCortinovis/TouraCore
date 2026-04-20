import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Ha tenant attivo?
  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    // Agency owner senza tenant: redirect /a/{slug}
    const admin = await createServiceRoleClient()
    const { data: agencyMembership } = await admin
      .from('agency_memberships')
      .select('agencies(slug)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (agencyMembership) {
      const agencyRel = (agencyMembership as unknown as { agencies?: unknown }).agencies
      const agencyData = Array.isArray(agencyRel) ? agencyRel[0] : agencyRel
      const agencySlug = (agencyData as { slug?: string } | null)?.slug
      if (agencySlug) redirect(`/a/${agencySlug}`)
    }

    redirect('/onboarding/step-1')
  }

  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('legal_details, country, modules, slug')
    .eq('id', tenantId)
    .single()

  // 2. Legal details?
  if (!tenant || !tenant.legal_details || Object.keys(tenant.legal_details as Record<string, unknown>).length === 0) {
    redirect('/onboarding/step-2')
  }

  // 3. Moduli selezionati?
  const modules = (tenant.modules ?? {}) as Record<string, { active: boolean; source: string }>
  const hasAnyModule = Object.keys(modules).length > 0
  if (!hasAnyModule) {
    redirect('/onboarding/step-modules')
  }

  // 4. Piano confermato? (se pending → step-plan, se attivo → procedi)
  const pendingCodes = Object.keys(modules).filter((k) => modules[k]?.source === 'onboarding_pending')
  if (pendingCodes.length > 0) {
    redirect('/onboarding/step-plan')
  }

  // 5. Prima entity?
  const { data: entities } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!entities || entities.length === 0) {
    redirect('/onboarding/step-3')
  }

  // Tutto configurato
  redirect(`/${tenant.slug}`)
}
