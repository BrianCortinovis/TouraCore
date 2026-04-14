import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Verifica se ha già un tenant attivo
  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/step-1')
  }

  // Ha un tenant — verifica se legal_details è configurato
  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('legal_details, country')
    .eq('id', tenantId)
    .single()

  if (!tenant || !tenant.legal_details || Object.keys(tenant.legal_details as Record<string, unknown>).length === 0) {
    redirect('/onboarding/step-2')
  }

  // Ha legal_details — verifica se ha almeno una property
  const { data: properties } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!properties || properties.length === 0) {
    redirect('/onboarding/step-3')
  }

  // Tutto configurato
  redirect('/account/overview')
}
