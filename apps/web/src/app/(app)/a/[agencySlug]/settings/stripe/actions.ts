'use server'

import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'

export async function connectStripeAction(formData: FormData): Promise<void> {
  const agencySlug = String(formData.get('agencySlug') ?? '')
  const ctx = await getVisibilityContext()
  if (!ctx.user || !hasPermission(ctx, 'billing.write')) {
    redirect(`/a/${agencySlug}/settings/stripe?error=forbidden`)
  }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, billing_email, stripe_connect_account_id')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) redirect(`/a/${agencySlug}/settings/stripe?error=agency_not_found`)
  // Verify caller is platform admin OR owner of this agency
  if (!ctx.isPlatformAdmin && ctx.agencyId !== (agency as { id: string }).id) {
    redirect(`/a/${agencySlug}/settings/stripe?error=forbidden`)
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) redirect(`/a/${agencySlug}/settings/stripe?error=stripe_not_configured`)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'

  let accountId = agency!.stripe_connect_account_id
  if (!accountId) {
    const accRes = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        type: 'express',
        email: agency!.billing_email ?? '',
        'capabilities[transfers][requested]': 'true',
        country: 'IT',
      }).toString(),
    })
    if (!accRes.ok) {
      const err = await accRes.text()
      console.warn('[connectStripeAction] create account failed:', err.slice(0, 200))
      redirect(`/a/${agencySlug}/settings/stripe?error=stripe_account_failed`)
    }
    const acc = (await accRes.json()) as { id: string }
    accountId = acc.id
    await supabase
      .from('agencies')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', agency!.id)
  }

  const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account: accountId!,
      refresh_url: `${baseUrl}/a/${agencySlug}/settings/stripe?refresh=1`,
      return_url: `${baseUrl}/a/${agencySlug}/settings/stripe?ok=1`,
      type: 'account_onboarding',
    }).toString(),
  })
  if (!linkRes.ok) {
    redirect(`/a/${agencySlug}/settings/stripe?error=stripe_link_failed`)
  }
  const link = (await linkRes.json()) as { url: string }
  redirect(link.url)
}
