'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { logAudit, getAuditContext } from '@touracore/audit'
import { z } from 'zod'
import {
  stripeCreateSubscriptionItem,
  stripeDeleteSubscriptionItem,
} from '@/lib/stripe-sub-sync'

const ModuleCodeEnum = z.enum([
  'hospitality',
  'restaurant',
  'wellness',
  'experiences',
  'bike_rental',
  'moto_rental',
  'ski_school',
])

const ToggleSchema = z.object({
  tenantSlug: z.string().min(1),
  moduleCode: ModuleCodeEnum,
  active: z.boolean(),
})

export async function toggleModuleAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { tenantSlug, moduleCode, active } = parsed.data
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return { success: false, error: 'Organizzazione non trovata' }

  const admin = await createServiceRoleClient()

  // Membership check: utente deve essere membro del tenant o platform admin
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!pa) {
    const { data: m } = await admin.from('memberships').select('id').eq('user_id', user.id).eq('tenant_id', tenant.id).eq('is_active', true).maybeSingle()
    if (!m) return { success: false, error: 'Permessi insufficienti' }
  }

  const current = (tenant.modules ?? {}) as Record<
    string,
    { active: boolean; source: string; since?: string; trial_until?: string }
  >

  // Deactivate guard: blocca se >0 entità attive per kind
  if (!active) {
    const MODULE_TO_KIND: Record<string, string> = {
      hospitality: 'accommodation',
      restaurant: 'restaurant',
      wellness: 'wellness',
      experiences: 'activity',
      bike_rental: 'bike_rental',
      moto_rental: 'moto_rental',
      ski_school: 'ski_school',
    }
    const kind = MODULE_TO_KIND[moduleCode]
    if (kind) {
      const { count } = await admin
        .from('entities')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('kind', kind)
        .eq('is_active', true)
      if ((count ?? 0) > 0) {
        return {
          success: false,
          error: `Disattiva prima le ${count} entità attive di tipo ${kind}`,
        }
      }
    }
  }

  const now = new Date().toISOString()
  const existing = current[moduleCode]
  current[moduleCode] = {
    active,
    source: active ? existing?.source ?? 'subscription' : 'subscription',
    since: existing?.since ?? now,
    ...(existing?.trial_until ? { trial_until: existing.trial_until } : {}),
  }

  const { error } = await admin
    .from('tenants')
    .update({ modules: current })
    .eq('id', tenant.id)

  if (error) return { success: false, error: error.message }

  await admin.from('module_activation_log').insert({
    tenant_id: tenant.id,
    module_code: moduleCode,
    action: active ? 'activated' : 'deactivated',
    actor_user_id: user.id,
    actor_scope: 'tenant_owner',
  })

  // Stripe sync (best-effort; logs warning on failure)
  try {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    const { data: cat } = await admin
      .from('module_catalog')
      .select('stripe_price_id_monthly, base_price_eur')
      .eq('code', moduleCode)
      .maybeSingle()

    if (sub?.stripe_subscription_id && cat?.stripe_price_id_monthly) {
      const { data: subItem } = await admin
        .from('subscription_items')
        .select('id, stripe_subscription_item_id')
        .eq('tenant_id', tenant.id)
        .eq('module_code', moduleCode)
        .maybeSingle()

      if (active) {
        if (!subItem) {
          const stripeItemId = await stripeCreateSubscriptionItem({
            subscriptionId: sub.stripe_subscription_id,
            priceId: cat.stripe_price_id_monthly,
            quantity: 1,
          })
          if (stripeItemId) {
            await admin.from('subscription_items').insert({
              subscription_id: sub.id,
              tenant_id: tenant.id,
              module_code: moduleCode,
              stripe_subscription_item_id: stripeItemId,
              quantity: 1,
              unit_amount_eur: Number(cat.base_price_eur ?? 0),
              status: 'active',
            })
          }
        } else if (subItem.stripe_subscription_item_id) {
          await admin
            .from('subscription_items')
            .update({ status: 'active' })
            .eq('id', subItem.id)
        }
      } else if (subItem?.stripe_subscription_item_id) {
        const ok = await stripeDeleteSubscriptionItem(subItem.stripe_subscription_item_id)
        await admin
          .from('subscription_items')
          .update({ status: 'canceled', stripe_subscription_item_id: ok ? null : subItem.stripe_subscription_item_id })
          .eq('id', subItem.id)
      }
    }
  } catch (e) {
    console.warn('[toggleModuleAction] stripe sync skipped:', e instanceof Error ? e.message : e)
  }

  const auditCtx = await getAuditContext(tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: `tenant.module_${active ? 'activate' : 'deactivate'}`,
    entityType: 'tenant',
    entityId: tenant.id,
    oldData: { modules: tenant.modules },
    newData: { modules: current },
  }).catch(() => {})

  revalidatePath(`/${tenantSlug}/settings/modules`)
  revalidatePath(`/${tenantSlug}`)
  return { success: true }
}

const ENTITY_KIND_PATH: Record<string, string> = {
  hospitality: '/onboarding/step-3',
  restaurant: '/onboarding/step-3/restaurant',
  wellness: '/onboarding/step-3/wellness',
  experiences: '/onboarding/step-3/experience',
  bike_rental: '/onboarding/step-3/bike',
  moto_rental: '/onboarding/step-3/moto',
  ski_school: '/onboarding/step-3/ski',
}

export async function getEntityCreationPath(moduleCode: string): Promise<string | null> {
  return ENTITY_KIND_PATH[moduleCode] ?? null
}
