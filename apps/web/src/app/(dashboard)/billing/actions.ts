'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getSiteBaseUrl } from '@/lib/site-url'
import {
  getSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
} from '@touracore/billing/server'
import {
  getConnectAccount,
  createConnectOnboardingUrl,
} from '@touracore/billing/server'
import {
  getLedgerEntries,
  getInvoices,
} from '@touracore/billing/server'
import type { SubscriptionPlan, LedgerEntryType } from '@touracore/billing'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function getSubscriptionAction() {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getSubscriptionAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  try {
    const supabase = await createServerSupabaseClient()
    return await getSubscription(supabase, bootstrap.tenant.id)
  } catch {
    return null
  }
}

export async function getConnectAccountAction() {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getConnectAccountAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  try {
    const supabase = await createServerSupabaseClient()
    return await getConnectAccount(supabase, bootstrap.tenant.id)
  } catch {
    return null
  }
}

export async function createCheckoutAction(plan: SubscriptionPlan): Promise<ActionResult> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) {
    return { success: false, error: 'Non autenticato' }
  }

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? getSiteBaseUrl()
    const url = await createCheckoutSession({
      tenantId: bootstrap.tenant.id,
      plan,
      customerEmail: bootstrap.user.email ?? '',
      successUrl: `${origin}/billing?session=success`,
      cancelUrl: `${origin}/billing?session=cancel`,
    })
    return { success: true, data: url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore checkout' }
  }
}

export async function openPortalAction(): Promise<ActionResult> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Non autenticato' }

  try {
    const supabase = await createServerSupabaseClient()
    const sub = await getSubscription(supabase, bootstrap.tenant.id)
    if (!sub?.stripe_customer_id) {
      return { success: false, error: 'Nessun abbonamento attivo' }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? getSiteBaseUrl()
    const url = await createCustomerPortalSession({
      customerId: sub.stripe_customer_id,
      returnUrl: `${origin}/billing`,
    })
    return { success: true, data: url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore portale' }
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Non autenticato' }

  try {
    const supabase = await createServerSupabaseClient()
    const sub = await getSubscription(supabase, bootstrap.tenant.id)
    if (!sub?.stripe_subscription_id) {
      return { success: false, error: 'Nessun abbonamento da cancellare' }
    }

    await cancelSubscription(sub.stripe_subscription_id)
    revalidatePath('/billing')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore cancellazione' }
  }
}

export async function startConnectOnboardingAction(): Promise<ActionResult> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Non autenticato' }

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? getSiteBaseUrl()
    const url = await createConnectOnboardingUrl({
      tenantId: bootstrap.tenant.id,
      refreshUrl: `${origin}/billing`,
      returnUrl: `${origin}/billing?connect=success`,
    })
    return { success: true, data: url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore onboarding' }
  }
}

export async function getLedgerAction(page = 1, type?: LedgerEntryType) {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getLedgerAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  try {
    const supabase = await createServerSupabaseClient()
    return await getLedgerEntries(supabase, bootstrap.tenant.id, { page, type })
  } catch {
    return { data: [], count: 0 }
  }
}

export async function getInvoicesAction() {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getInvoicesAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  try {
    const supabase = await createServerSupabaseClient()
    return await getInvoices(supabase, bootstrap.tenant.id)
  } catch {
    return []
  }
}
