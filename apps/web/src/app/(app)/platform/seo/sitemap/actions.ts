'use server'

import { revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'

export async function revalidateSeoCacheAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false, error: 'Non autorizzato' }

  for (const tag of ['listings', 'public-listings', 'discover', 'sitemap']) {
    revalidateTag(tag, 'default')
  }
  return { ok: true }
}
