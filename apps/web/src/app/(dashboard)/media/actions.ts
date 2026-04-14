'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  FileValidationSchema,
  MediaUploadMetaSchema,
} from '@touracore/media'
import {
  uploadFile,
  deleteFile,
  listMedia,
  updateMediaAltText,
} from '@touracore/media/server'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function uploadMediaAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'Nessun file selezionato.' }
  }

  const validation = FileValidationSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  })

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues.map((i) => i.message).join(', '),
    }
  }

  const altText = formData.get('alt_text')
  const metaParsed = MediaUploadMetaSchema.safeParse({
    alt_text: typeof altText === 'string' ? altText : undefined,
  })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Sessione scaduta.' }
  }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    return { success: false, error: 'Nessun tenant attivo.' }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadFile(supabase, {
      buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      tenantId: bootstrap.tenant.id,
      userId: user.id,
      meta: metaParsed.success ? metaParsed.data : undefined,
    })

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'media.upload',
      entityType: 'media',
      entityId: result.media.id,
      newData: {
        filename: result.media.filename,
        original_name: result.media.original_name,
        mime_type: result.media.mime_type,
        size_bytes: result.media.size_bytes,
      },
    })

    revalidatePath('/media')
    return { success: true, data: result.media }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore upload sconosciuto'
    return { success: false, error: message }
  }
}

export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  if (!mediaId || typeof mediaId !== 'string') {
    return { success: false, error: 'ID media non valido.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Sessione scaduta.' }
  }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    return { success: false, error: 'Nessun tenant attivo.' }
  }

  try {
    await deleteFile(supabase, mediaId)

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'media.delete',
      entityType: 'media',
      entityId: mediaId,
    })

    revalidatePath('/media')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore eliminazione sconosciuto'
    return { success: false, error: message }
  }
}

export async function updateAltTextAction(
  mediaId: string,
  altText: string
): Promise<ActionResult> {
  if (!mediaId || typeof mediaId !== 'string') {
    return { success: false, error: 'ID media non valido.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Sessione scaduta.' }
  }

  try {
    const updated = await updateMediaAltText(supabase, mediaId, altText)
    revalidatePath('/media')
    return { success: true, data: updated }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore aggiornamento'
    return { success: false, error: message }
  }
}

export async function listMediaAction(
  page: number = 1,
  mimeFilter?: string,
  search?: string
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[listMediaAction] Utente non autenticato')
    throw new Error('TENANT_REQUIRED')
  }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[listMediaAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  return listMedia(supabase, {
    tenant_id: bootstrap.tenant.id,
    page,
    per_page: 24,
    mime_filter: mimeFilter,
    search,
  })
}
