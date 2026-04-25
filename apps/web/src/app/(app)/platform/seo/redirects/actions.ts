'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'

const PathSchema = z.string().min(1).max(500).startsWith('/')

const CreateSchema = z.object({
  sourcePath: PathSchema,
  targetPath: PathSchema,
  redirectType: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  notes: z.string().max(500).nullable(),
})

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non autenticato', supabase: null }
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false as const, error: 'Non autorizzato', supabase: null }
  return { ok: true as const, supabase, userId: user.id }
}

export async function createRedirectAction(input: z.infer<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Input non valido' }

  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false as const, error: auth.error }

  const { data, error } = await auth.supabase
    .from('platform_redirects')
    .insert({
      source_path: parsed.data.sourcePath,
      target_path: parsed.data.targetPath,
      redirect_type: parsed.data.redirectType,
      notes: parsed.data.notes,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, row: data }
}

export async function deleteRedirectAction(id: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false as const, error: auth.error }
  const { error } = await auth.supabase.from('platform_redirects').delete().eq('id', id)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function toggleRedirectAction(id: string, isActive: boolean) {
  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false as const, error: auth.error }
  const { error } = await auth.supabase.from('platform_redirects').update({ is_active: isActive }).eq('id', id)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
