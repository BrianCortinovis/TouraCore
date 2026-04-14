'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

const updateProfileSchema = z.object({
  display_name: z.string().min(1, 'Il nome è obbligatorio').max(100, 'Nome troppo lungo'),
  avatar_url: z.string().url('URL avatar non valido').or(z.literal('')).nullable(),
  locale: z.enum(['it', 'en', 'de', 'fr', 'es']),
  timezone: z.string().min(1, 'Fuso orario obbligatorio'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

interface ActionResult {
  success: boolean
  error?: string
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    return { success: false, error: 'Sessione scaduta. Effettua nuovamente il login.' }
  }

  const user = bootstrap.user

  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, locale, timezone')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.display_name,
      avatar_url: parsed.data.avatar_url || null,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: 'Errore durante il salvataggio del profilo.' }
  }

  if (bootstrap.tenant) {
    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'profile.update',
      entityType: 'profile',
      entityId: user.id,
      oldData: oldProfile as Record<string, unknown> | undefined,
      newData: parsed.data as unknown as Record<string, unknown>,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return { success: true }
}

export async function switchProperty(entityId: string): Promise<ActionResult> {
  if (!entityId || typeof entityId !== 'string') {
    return { success: false, error: 'ID proprietà non valido' }
  }

  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()

  if (!bootstrap.user) {
    return { success: false, error: 'Sessione scaduta.' }
  }

  const user = bootstrap.user

  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .single()

  if (!staffMember) {
    return { success: false, error: 'Non hai accesso a questa proprietà.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('touracore_selected_entity', entityId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  if (bootstrap.tenant) {
    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'property.switch',
      entityType: 'property',
      entityId: entityId,
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
