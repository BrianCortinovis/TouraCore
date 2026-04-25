'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'

const Schema = z.object({
  listingId: z.string().uuid(),
  seoTitle: z.string().min(1).max(70).nullable(),
  seoDescription: z.string().min(1).max(160).nullable(),
  ogImageUrl: z.string().url().nullable(),
})

export async function updateListingSeoAction(input: z.infer<typeof Schema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Input non valido' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false, error: 'Non autorizzato' }

  const { error } = await supabase
    .from('public_listings')
    .update({
      seo_title: parsed.data.seoTitle,
      seo_description: parsed.data.seoDescription,
      og_image_url: parsed.data.ogImageUrl,
    })
    .eq('id', parsed.data.listingId)

  if (error) return { ok: false, error: error.message }

  revalidateTag('listings', 'default')
  revalidateTag('public-listings', 'default')
  return { ok: true }
}
