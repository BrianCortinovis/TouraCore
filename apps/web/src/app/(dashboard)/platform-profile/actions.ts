'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { logAudit } from '@touracore/audit'

export type ProfileFormState = {
  profile: {
    id: string | null
    username: string
    display_name: string
    intro_headline: string
    intro_description: string
    default_booking_mode: 'multi' | 'singles' | 'mixed'
    is_public: boolean
    avatar_media_id: string | null
    avatar_url: string | null
  }
  tenantSlug: string
  availableListings: {
    listing_id: string
    entity_slug: string
    entity_name: string
    entity_kind: string
    is_public: boolean
    selected: boolean
    sort_order: number
  }[]
}

export async function loadProfileFormState(): Promise<{ success: boolean; data?: ProfileFormState; error?: string }> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user) return { success: false, error: 'AUTH_REQUIRED' }

  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('platform_profiles')
    .select('id, username, display_name, intro_headline, intro_description, default_booking_mode, is_public, tenant_id, avatar_media_id')
    .eq('user_id', bootstrap.user.id)
    .maybeSingle()

  let avatarUrl: string | null = null
  if (profile?.avatar_media_id) {
    const { data: am } = await supabase
      .from('media')
      .select('url')
      .eq('id', profile.avatar_media_id)
      .maybeSingle()
    avatarUrl = am?.url ?? null
  }

  const tenantSlug = bootstrap.tenant?.slug ?? ''

  // List tenant listings user can expose
  const { data: listings } = await supabase
    .from('public_listings')
    .select('id, entity_id, is_public, entities!inner(slug, name, kind, tenant_id)')
    .eq('entities.tenant_id', bootstrap.tenant?.id ?? '00000000-0000-0000-0000-000000000000')

  // Existing pivot entries
  const pivotIds = profile
    ? (
        await supabase
          .from('platform_profile_listings')
          .select('listing_id, sort_order')
          .eq('profile_id', profile.id)
      ).data ?? []
    : []
  const pivotMap = new Map(pivotIds.map((p) => [p.listing_id, p.sort_order]))

  type EntityJoin = { slug: string; name: string; kind: string; tenant_id: string }
  const availableListings = (listings ?? []).map((l) => {
    const raw = (l as unknown as { entities: EntityJoin | EntityJoin[] }).entities
    const e = Array.isArray(raw) ? raw[0] : raw
    return {
      listing_id: l.id,
      entity_slug: e?.slug ?? '',
      entity_name: e?.name ?? '',
      entity_kind: e?.kind ?? '',
      is_public: l.is_public as boolean,
      selected: pivotMap.has(l.id),
      sort_order: pivotMap.get(l.id) ?? 0,
    }
  })

  return {
    success: true,
    data: {
      profile: {
        id: profile?.id ?? null,
        username: profile?.username ?? '',
        display_name: profile?.display_name ?? '',
        intro_headline: profile?.intro_headline ?? '',
        intro_description: profile?.intro_description ?? '',
        default_booking_mode: (profile?.default_booking_mode as 'multi' | 'singles' | 'mixed') ?? 'multi',
        is_public: profile?.is_public ?? true,
        avatar_media_id: (profile?.avatar_media_id as string | null) ?? null,
        avatar_url: avatarUrl,
      },
      tenantSlug,
      availableListings: availableListings.sort((a, b) => a.entity_name.localeCompare(b.entity_name)),
    },
  }
}

const SaveSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9_-]+$/),
  display_name: z.string().min(1).max(100),
  intro_headline: z.string().max(200).nullable(),
  intro_description: z.string().max(2000).nullable(),
  default_booking_mode: z.enum(['multi', 'singles', 'mixed']),
  is_public: z.boolean(),
  listing_ids: z.array(z.string()).default([]),
  avatar_media_id: z.string().uuid().nullable().optional(),
})

export async function saveProfileAction(
  input: z.input<typeof SaveSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SaveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user) return { success: false, error: 'AUTH_REQUIRED' }

  const supabase = await createServerSupabaseClient()

  // Verify avatar media ownership when set
  if (parsed.data.avatar_media_id && bootstrap.tenant?.id) {
    const { data: owned } = await supabase
      .from('media')
      .select('id')
      .eq('id', parsed.data.avatar_media_id)
      .eq('tenant_id', bootstrap.tenant.id)
      .maybeSingle()
    if (!owned) return { success: false, error: 'AVATAR_NOT_OWNED' }
  }

  // Upsert profile
  const { data: profile, error: upsertErr } = await supabase
    .from('platform_profiles')
    .upsert(
      {
        user_id: bootstrap.user.id,
        tenant_id: bootstrap.tenant?.id ?? null,
        username: parsed.data.username,
        display_name: parsed.data.display_name,
        intro_headline: parsed.data.intro_headline,
        intro_description: parsed.data.intro_description,
        default_booking_mode: parsed.data.default_booking_mode,
        is_public: parsed.data.is_public,
        avatar_media_id: parsed.data.avatar_media_id ?? null,
      },
      { onConflict: 'user_id' }
    )
    .select('id, username')
    .single()

  if (upsertErr || !profile) return { success: false, error: upsertErr?.message ?? 'UPSERT_FAILED' }

  // Replace pivot entries
  await supabase.from('platform_profile_listings').delete().eq('profile_id', profile.id)

  if (parsed.data.listing_ids.length > 0) {
    const rows = parsed.data.listing_ids.map((lid, idx) => ({
      profile_id: profile.id,
      listing_id: lid,
      sort_order: idx,
    }))
    await supabase.from('platform_profile_listings').insert(rows)
  }

  try {
    await logAudit({
      context: { tenantId: bootstrap.tenant?.id ?? '', userId: bootstrap.user.id },
      action: 'platform_profile_saved',
      entityType: 'platform_profile',
      entityId: profile.id,
      newData: { username: profile.username, listings: parsed.data.listing_ids.length },
    })
  } catch {}

  revalidatePath(`/u/${profile.username}`)
  return { success: true }
}
