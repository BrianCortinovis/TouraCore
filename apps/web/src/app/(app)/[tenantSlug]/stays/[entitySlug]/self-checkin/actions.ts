'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { z } from 'zod'
import { getSiteBaseUrl } from '@/lib/site-url'

const ToggleSchema = z.object({
  entitySlug: z.string().min(1),
  tenantSlug: z.string().min(1),
  enabled: z.boolean(),
})

export async function toggleSelfCheckinAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { entitySlug, tenantSlug, enabled } = parsed.data
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return { success: false, error: 'Struttura non trovata' }

  const { error } = await supabase
    .from('accommodations')
    .update({ self_checkin_enabled: enabled })
    .eq('entity_id', entity.id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/self-checkin`)
  return { success: true }
}

export async function getSelfCheckinStatus(
  entitySlug: string
): Promise<{ enabled: boolean; checkinUrl: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return { enabled: false, checkinUrl: '' }

  const { data: acc } = await supabase
    .from('accommodations')
    .select('self_checkin_enabled')
    .eq('entity_id', entity.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? getSiteBaseUrl()

  return {
    enabled: acc?.self_checkin_enabled ?? false,
    checkinUrl: `${appUrl}/checkin/${entitySlug}`,
  }
}
