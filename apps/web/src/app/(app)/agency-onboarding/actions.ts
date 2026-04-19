'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { createServiceRoleClient } from '@touracore/db/server'
import { logAgencyAction } from '@touracore/audit'
import { enqueueNotification } from '@touracore/notifications'

export interface OnboardingInput {
  name: string
  slug: string
  legalName: string
  billingEmail: string
  vatId?: string
  country: string
  brandingColor?: string
  brandingLogoUrl?: string
  plan: 'agency_starter' | 'agency_pro' | 'agency_enterprise'
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48)
}

export async function createAgencyOnboardingAction(input: OnboardingInput): Promise<{
  ok: boolean
  error?: string
  agencySlug?: string
  stripeOnboardingUrl?: string | null
}> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const supabase = await createServiceRoleClient()

  const slug = slugify(input.slug || input.name)
  if (!slug) return { ok: false, error: 'invalid_slug' }

  const { data: existing } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { ok: false, error: 'slug_taken' }

  const { data: already } = await supabase
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (already) return { ok: false, error: 'already_member' }

  const maxTenants = input.plan === 'agency_enterprise' ? 999 : input.plan === 'agency_pro' ? 10 : 3

  const { data: agencyInsert, error: agencyErr } = await supabase
    .from('agencies')
    .insert({
      name: input.name,
      slug,
      legal_name: input.legalName,
      billing_email: input.billingEmail,
      plan: input.plan,
      max_tenants: maxTenants,
      is_active: true,
      branding: {
        color: input.brandingColor ?? '#4f46e5',
        logo_url: input.brandingLogoUrl ?? null,
      },
      modules: { hospitality: true, restaurant: true, experiences: true, bike_rental: true },
    })
    .select('id, slug')
    .single()

  if (agencyErr || !agencyInsert) {
    return { ok: false, error: agencyErr?.message ?? 'agency_create_failed' }
  }

  const { error: memErr } = await supabase.from('agency_memberships').insert({
    agency_id: agencyInsert.id,
    user_id: user.id,
    role: 'agency_owner',
    is_active: true,
    permissions: {
      'billing.read': true,
      'billing.write': true,
      'team.admin': true,
      'tenant.read': true,
      'tenant.write': true,
    },
  })
  if (memErr) {
    return { ok: false, error: `membership_failed: ${memErr.message}` }
  }

  let stripeOnboardingUrl: string | null = null
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey) {
    try {
      const accRes = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          email: input.billingEmail,
          'capabilities[transfers][requested]': 'true',
          country: input.country || 'IT',
        }).toString(),
      })
      if (accRes.ok) {
        const acc = (await accRes.json()) as { id: string }
        await supabase
          .from('agencies')
          .update({ stripe_connect_account_id: acc.id })
          .eq('id', agencyInsert.id)

        const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            account: acc.id,
            refresh_url: `https://touracore.vercel.app/a/${agencyInsert.slug}/settings/stripe?refresh=1`,
            return_url: `https://touracore.vercel.app/a/${agencyInsert.slug}/settings/stripe?ok=1`,
            type: 'account_onboarding',
          }).toString(),
        })
        if (linkRes.ok) {
          const link = (await linkRes.json()) as { url: string }
          stripeOnboardingUrl = link.url
        }
      }
    } catch (e) {
      console.warn('[onboarding] stripe optional fail:', e instanceof Error ? e.message : e)
    }
  }

  await logAgencyAction({
    action: 'agency.onboarding_completed',
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: 'agency_owner',
    agencyId: agencyInsert.id,
    metadata: { plan: input.plan, stripe: Boolean(stripeOnboardingUrl) },
  })

  await enqueueNotification({
    eventKey: 'agency.onboarding_completed',
    templateKey: 'agency.onboarding_completed',
    channel: 'email',
    scope: 'agency',
    agencyId: agencyInsert.id,
    recipientUserId: user.id,
    recipientEmail: input.billingEmail,
    variables: {
      agency: {
        name: input.name,
        dashboard_url: `https://touracore.vercel.app/a/${agencyInsert.slug}`,
      },
    },
    idempotencyKey: `agency.onboarded.${agencyInsert.id}`,
  })

  return { ok: true, agencySlug: agencyInsert.slug, stripeOnboardingUrl }
}

export async function redirectToAgency(slug: string): Promise<never> {
  redirect(`/a/${slug}`)
}
