'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  listTenantSettings,
  setTenantSetting,
  deleteTenantSetting,
  listModuleSettings,
  setModuleSetting,
  listEntitySettings,
  setEntitySetting,
  SetSettingSchema,
} from '@touracore/settings'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

// --- Lettura impostazioni ---

export async function getTenantSettingsAction() {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getTenantSettingsAction] TENANT_REQUIRED — utente senza attività')
    throw new Error('TENANT_REQUIRED')
  }

  return listTenantSettings(supabase, bootstrap.tenant.id)
}

// --- Salvataggio singolo ---

export async function setTenantSettingAction(
  key: string,
  value: unknown
): Promise<ActionResult> {
  const parsed = SetSettingSchema.safeParse({ key, value })
  if (!parsed.success) {
    return { success: false, error: 'Dati non validi' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  try {
    await setTenantSetting(supabase, bootstrap.tenant.id, parsed.data.key, parsed.data.value)

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'settings.tenant.update',
      entityType: 'tenant_settings',
      entityId: bootstrap.tenant.id,
      newData: { key: parsed.data.key, value: parsed.data.value },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

// --- Salvataggio batch (per tab) ---

export async function saveTenantSettingsBatchAction(
  settings: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  try {
    const entries = Object.entries(settings)
    for (const [key, value] of entries) {
      await setTenantSetting(supabase, bootstrap.tenant.id, key, value)
    }

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'settings.tenant.batch_update',
      entityType: 'tenant_settings',
      entityId: bootstrap.tenant.id,
      newData: { keys: entries.map(([k]) => k) },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore durante il salvataggio.' }
  }
}

// --- Aggiornamento dati attività (nome + indirizzo pubblico) ---

export async function updateBusinessInfoAction(input: {
  tenantName: string
  tenantSlug: string
  settings: Record<string, unknown>
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  const tenantId = bootstrap.tenant.id

  try {
    if (input.tenantName !== bootstrap.tenant.name || input.tenantSlug !== bootstrap.tenant.slug) {
      if (input.tenantSlug && input.tenantSlug !== bootstrap.tenant.slug) {
        const { data: existing } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', input.tenantSlug)
          .neq('id', tenantId)
          .maybeSingle()

        if (existing) {
          return { success: false, error: 'Questo indirizzo è già utilizzato. Scegline un altro.' }
        }
      }

      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: input.tenantName,
          slug: input.tenantSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId)

      if (tenantError) {
        return { success: false, error: 'Non siamo riusciti ad aggiornare i dati. Riprova tra un momento.' }
      }
    }

    const entries = Object.entries(input.settings)
    for (const [key, value] of entries) {
      await setTenantSetting(supabase, tenantId, key, value)
    }

    const auditCtx = await getAuditContext(tenantId, user.id)
    await logAudit({
      context: auditCtx,
      action: 'settings.business.update',
      entityType: 'tenant',
      entityId: tenantId,
      newData: { name: input.tenantName, slug: input.tenantSlug, settingKeys: entries.map(([k]) => k) },
    })

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore durante il salvataggio.' }
  }
}

// --- Eliminazione singola ---

export async function deleteTenantSettingAction(key: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  try {
    await deleteTenantSetting(supabase, bootstrap.tenant.id, key)

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'settings.tenant.delete',
      entityType: 'tenant_settings',
      entityId: bootstrap.tenant.id,
      newData: { key },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

// --- Impostazioni modulo ---

export async function getModuleSettingsAction(module: string) {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getModuleSettingsAction] TENANT_REQUIRED — utente senza attività')
    throw new Error('TENANT_REQUIRED')
  }

  return listModuleSettings(supabase, bootstrap.tenant.id, module)
}

export async function setModuleSettingAction(
  module: string,
  key: string,
  value: unknown
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  try {
    await setModuleSetting(supabase, bootstrap.tenant.id, module, key, value)
    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

// --- Impostazioni entità ---

export async function getEntitySettingsAction(entityType: string, entityId: string) {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getEntitySettingsAction] TENANT_REQUIRED — utente senza attività')
    throw new Error('TENANT_REQUIRED')
  }

  return listEntitySettings(supabase, bootstrap.tenant.id, entityType, entityId)
}

export async function setEntitySettingAction(
  entityType: string,
  entityId: string,
  key: string,
  value: unknown
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  try {
    await setEntitySetting(supabase, bootstrap.tenant.id, entityType, entityId, key, value)
    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
