'use server'

import { revalidateTag } from 'next/cache'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'

const Schema = z.object({
  default_title_template: z.string().max(150).nullable(),
  default_description: z.string().max(160).nullable(),
  default_og_image_url: z.string().max(500).nullable(),
  robots_txt_override: z.string().max(5000).nullable(),
  google_site_verification: z.string().max(200).nullable(),
  bing_site_verification: z.string().max(200).nullable(),
  ga4_measurement_id: z.string().max(50).nullable(),
  ga4_api_secret: z.string().max(200).nullable(),
  ga4_enabled: z.boolean(),
  search_console_property: z.string().max(500).nullable(),
  custom_head_tags: z.string().max(5000).nullable(),
})

export async function saveSeoSettingsAction(input: z.infer<typeof Schema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Input non valido' }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_platform_admin === true
  if (!isAdmin) return { ok: false, error: 'Non autorizzato' }

  const { error } = await supabase
    .from('seo_settings')
    .update({ ...parsed.data, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('scope', 'platform')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/robots.txt')
  revalidateTag('seo-settings', 'default')
  return { ok: true }
}
