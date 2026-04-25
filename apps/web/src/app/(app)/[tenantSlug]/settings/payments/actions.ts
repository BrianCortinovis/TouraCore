'use server'

import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'

const STRIPE_API = 'https://api.stripe.com/v1'

async function stripePOST(path: string, body: Record<string, string>): Promise<Response> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('stripe_not_configured')
  return fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
}

export async function connectStripeTenantAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const ctx = await getVisibilityContext()
  if (!ctx.user || !hasPermission(ctx, 'billing.write')) {
    redirect(`/${tenantSlug}/settings/payments?error=forbidden`)
  }

  const supabase = await createServiceRoleClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, stripe_connect_account_id, billing_email')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) redirect(`/${tenantSlug}/settings/payments?error=tenant_not_found`)
  const t = tenant as { id: string; slug: string; name: string; stripe_connect_account_id: string | null; billing_email: string | null }

  if (!process.env.STRIPE_SECRET_KEY) {
    redirect(`/${tenantSlug}/settings/payments?error=stripe_not_configured`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'

  let accountId = t.stripe_connect_account_id
  if (!accountId) {
    const accRes = await stripePOST('/accounts', {
      type: 'express',
      country: 'IT',
      email: t.billing_email ?? '',
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
      'business_profile[name]': t.name,
      'metadata[tenant_id]': t.id,
      'metadata[tenant_slug]': t.slug,
    })
    if (!accRes.ok) {
      const err = await accRes.text()
      console.warn('[connectStripeTenantAction] create failed:', err.slice(0, 300))
      redirect(`/${tenantSlug}/settings/payments?error=stripe_account_failed`)
    }
    const acc = (await accRes.json()) as { id: string; country: string }
    accountId = acc.id
    await supabase
      .from('tenants')
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_country: acc.country,
        stripe_connect_updated_at: new Date().toISOString(),
      })
      .eq('id', t.id)
  }

  const linkRes = await stripePOST('/account_links', {
    account: accountId!,
    refresh_url: `${baseUrl}/${tenantSlug}/settings/payments?refresh=1`,
    return_url: `${baseUrl}/${tenantSlug}/settings/payments?ok=1`,
    type: 'account_onboarding',
  })
  if (!linkRes.ok) {
    const err = await linkRes.text()
    console.warn('[connectStripeTenantAction] link failed:', err.slice(0, 300))
    redirect(`/${tenantSlug}/settings/payments?error=stripe_link_failed`)
  }
  const link = (await linkRes.json()) as { url: string }
  redirect(link.url)
}

export async function refreshStripeStatusAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const ctx = await getVisibilityContext()
  if (!ctx.user || !hasPermission(ctx, 'billing.write')) {
    redirect(`/${tenantSlug}/settings/payments?error=forbidden`)
  }

  const supabase = await createServiceRoleClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_connect_account_id')
    .eq('slug', tenantSlug)
    .maybeSingle()

  const t = tenant as { id: string; stripe_connect_account_id: string | null } | null
  if (!t?.stripe_connect_account_id) {
    redirect(`/${tenantSlug}/settings/payments?error=no_account`)
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) redirect(`/${tenantSlug}/settings/payments?error=stripe_not_configured`)

  const accRes = await fetch(`${STRIPE_API}/accounts/${t!.stripe_connect_account_id}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!accRes.ok) redirect(`/${tenantSlug}/settings/payments?error=fetch_failed`)

  const acc = (await accRes.json()) as {
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    requirements: unknown
  }

  await supabase
    .from('tenants')
    .update({
      stripe_connect_charges_enabled: acc.charges_enabled,
      stripe_connect_payouts_enabled: acc.payouts_enabled,
      stripe_connect_details_submitted: acc.details_submitted,
      stripe_connect_requirements: acc.requirements,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('id', t!.id)

  redirect(`/${tenantSlug}/settings/payments?refreshed=1`)
}

export async function openStripeDashboardAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const ctx = await getVisibilityContext()
  if (!ctx.user || !hasPermission(ctx, 'billing.write')) {
    redirect(`/${tenantSlug}/settings/payments?error=forbidden`)
  }

  const supabase = await createServiceRoleClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, stripe_connect_account_id')
    .eq('slug', tenantSlug)
    .maybeSingle()

  const t = tenant as { id: string; stripe_connect_account_id: string | null } | null
  if (!t?.stripe_connect_account_id) {
    redirect(`/${tenantSlug}/settings/payments?error=no_account`)
  }

  const loginRes = await stripePOST(`/accounts/${t!.stripe_connect_account_id}/login_links`, {})
  if (!loginRes.ok) redirect(`/${tenantSlug}/settings/payments?error=dashboard_failed`)

  const link = (await loginRes.json()) as { url: string }
  redirect(link.url)
}
