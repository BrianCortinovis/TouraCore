'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { logAudit, getAuditContext } from '@touracore/audit'
import { z } from 'zod'

const ModulesSchema = z.object({
  tenantSlug: z.string().min(1),
  hospitality: z.boolean(),
  experiences: z.boolean(),
})

export async function saveModulesAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = ModulesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { tenantSlug, hospitality, experiences } = parsed.data
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return { success: false, error: 'Organizzazione non trovata' }

  const oldModules = (tenant.modules as Record<string, boolean>) ?? {}
  const newModules = { ...oldModules, hospitality, experiences }

  const { error } = await supabase
    .from('tenants')
    .update({ modules: newModules })
    .eq('id', tenant.id)

  if (error) return { success: false, error: error.message }

  const auditCtx = await getAuditContext(tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: 'tenant.modules_update',
    entityType: 'tenant',
    entityId: tenant.id,
    oldData: { modules: oldModules },
    newData: { modules: newModules },
  }).catch(() => {})

  revalidatePath(`/${tenantSlug}/settings/modules`)
  revalidatePath(`/${tenantSlug}`)
  return { success: true }
}
