'use server'

import { createServerSupabaseClient } from '@touracore/db/server'

interface ResolveInput {
  id: string
  redirectTarget: string | null
}

export async function resolveError404Action(input: ResolveInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false, error: 'Non autorizzato' }

  const { error } = await supabase
    .from('platform_404_log')
    .update({ resolved: true })
    .eq('id', input.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
