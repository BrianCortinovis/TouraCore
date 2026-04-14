'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1, 'Il nome è obbligatorio').max(100, 'Nome troppo lungo'),
  locale: z.enum(['it', 'en', 'de', 'fr']),
  timezone: z.string().min(1, 'Fuso orario obbligatorio'),
})

interface ActionResult {
  success: boolean
  error?: string
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = UpdateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user) return { success: false, error: 'Sessione scaduta.' }

  const user = bootstrap.user

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.display_name,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)

  if (error) return { success: false, error: 'Errore durante il salvataggio.' }

  if (bootstrap.tenant) {
    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'profile.update',
      entityType: 'profile',
      entityId: user.id,
      newData: parsed.data as unknown as Record<string, unknown>,
    })
  }

  revalidatePath('/account/profile')
  return { success: true }
}
