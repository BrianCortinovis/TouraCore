'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non autenticato', supabase: null, userId: null }
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false as const, error: 'Non autorizzato', supabase: null, userId: null }
  return { ok: true as const, supabase, userId: user.id }
}

export async function flagReviewAction(id: string, flagged: boolean) {
  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false as const, error: auth.error }

  const { error } = await auth.supabase
    .from('reviews')
    .update({ is_flagged: flagged, flagged })
    .eq('id', id)

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

const ReplySchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(1).max(3000),
})

export async function replyReviewAction(id: string, body: string) {
  const parsed = ReplySchema.safeParse({ id, body })
  if (!parsed.success) return { ok: false as const, error: 'Input non valido' }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false as const, error: auth.error }

  const now = new Date().toISOString()
  const { error } = await auth.supabase
    .from('reviews')
    .update({
      response_body: parsed.data.body,
      response_published_at: now,
      response_author: auth.userId,
      reply_body: parsed.data.body,
      reply_at: now,
      reply_by_user_id: auth.userId,
    })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
