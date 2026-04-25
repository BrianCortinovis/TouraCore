'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { logAudit } from '@touracore/audit'
import { parseVideoLink, fetchVideoTitle } from '@touracore/media'
import { revalidateListing } from '@/lib/cache-tags'
import { revalidatePath } from 'next/cache'

export type GalleryItem = {
  id: string
  media_id: string
  url: string
  alt_text: string | null
  width: number | null
  height: number | null
  sort_order: number
  is_hero: boolean
  caption: string | null
  media_kind: 'photo' | 'video'
  video_platform: 'youtube' | 'vimeo' | null
  video_id: string | null
  video_thumbnail_url: string | null
  video_title: string | null
}

export type GalleryState = {
  entityId: string
  entitySlug: string
  entityName: string
  entityKind: string
  tenantSlug: string
  listingId: string | null
  isPublic: boolean
  heroMediaId: string | null
  heroUrl: string | null
  items: GalleryItem[]
}

async function ensureEntityOwnership(entityId: string) {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user || !bootstrap.tenant) {
    return { ok: false as const, error: 'TENANT_REQUIRED' }
  }
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, tenant_id')
    .eq('id', entityId)
    .eq('tenant_id', bootstrap.tenant.id)
    .maybeSingle()
  if (!entity) return { ok: false as const, error: 'ENTITY_NOT_FOUND' }
  return { ok: true as const, bootstrap, supabase, entity }
}

async function getOrCreateListing(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  entityId: string,
  tenantId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('public_listings')
    .select('id')
    .eq('entity_id', entityId)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('public_listings')
    .insert({ entity_id: entityId, tenant_id: tenantId, is_public: false })
    .select('id')
    .single()
  if (error || !created) return null
  return created.id
}

export async function loadGalleryStateAction(
  entityId: string
): Promise<{ success: boolean; data?: GalleryState; error?: string }> {
  const guard = await ensureEntityOwnership(entityId)
  if (!guard.ok) return { success: false, error: guard.error }

  const { supabase, entity, bootstrap } = guard

  const { data: listing } = await supabase
    .from('public_listings')
    .select('id, is_public, hero_media_id')
    .eq('entity_id', entity.id)
    .maybeSingle()

  let items: GalleryItem[] = []
  let heroUrl: string | null = null

  if (listing) {
    const { data: rows } = await supabase
      .from('listing_media')
      .select('id, media_id, sort_order, is_hero, caption, media_kind, media:media_id(url, alt_text, width, height, video_platform, video_id, video_thumbnail_url, video_title)')
      .eq('listing_id', listing.id)
      .order('sort_order', { ascending: true })

    type MediaJoin = {
      url: string
      alt_text: string | null
      width: number | null
      height: number | null
      video_platform: 'youtube' | 'vimeo' | null
      video_id: string | null
      video_thumbnail_url: string | null
      video_title: string | null
    }
    items = (rows ?? []).map((r) => {
      const raw = (r as unknown as { media: MediaJoin | MediaJoin[] | null }).media
      const m = Array.isArray(raw) ? raw[0] : raw
      return {
        id: r.id as string,
        media_id: r.media_id as string,
        url: m?.url ?? '',
        alt_text: m?.alt_text ?? null,
        width: m?.width ?? null,
        height: m?.height ?? null,
        sort_order: r.sort_order as number,
        is_hero: r.is_hero as boolean,
        caption: (r.caption as string | null) ?? null,
        media_kind: ((r as { media_kind?: string }).media_kind ?? 'photo') as 'photo' | 'video',
        video_platform: m?.video_platform ?? null,
        video_id: m?.video_id ?? null,
        video_thumbnail_url: m?.video_thumbnail_url ?? null,
        video_title: m?.video_title ?? null,
      }
    })

    if (listing.hero_media_id) {
      const { data: heroMedia } = await supabase
        .from('media')
        .select('url')
        .eq('id', listing.hero_media_id)
        .maybeSingle()
      heroUrl = heroMedia?.url ?? null
    }
  }

  return {
    success: true,
    data: {
      entityId: entity.id,
      entitySlug: entity.slug,
      entityName: entity.name,
      entityKind: entity.kind,
      tenantSlug: bootstrap.tenant?.slug ?? '',
      listingId: listing?.id ?? null,
      isPublic: listing?.is_public ?? false,
      heroMediaId: listing?.hero_media_id ?? null,
      heroUrl,
      items,
    },
  }
}

const AttachSchema = z.object({
  entityId: z.string().min(1),
  mediaIds: z.array(z.string()).min(1).max(50),
})

export async function attachListingMediaAction(
  input: z.input<typeof AttachSchema>
): Promise<{ success: boolean; error?: string; added?: number }> {
  const parsed = AttachSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  const listingId = await getOrCreateListing(supabase, entity.id, entity.tenant_id)
  if (!listingId) return { success: false, error: 'LISTING_CREATE_FAILED' }

  // Verify media ownership (RLS already enforces, but explicit check helps validation)
  const { data: ownedMedia } = await supabase
    .from('media')
    .select('id')
    .eq('tenant_id', entity.tenant_id)
    .in('id', parsed.data.mediaIds)
  const validIds = new Set((ownedMedia ?? []).map((m) => m.id))
  const filteredIds = parsed.data.mediaIds.filter((id) => validIds.has(id))
  if (filteredIds.length === 0) return { success: false, error: 'MEDIA_NOT_FOUND' }

  // Find current max sort_order
  const { data: lastRow } = await supabase
    .from('listing_media')
    .select('sort_order')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const startOrder = (lastRow?.sort_order ?? -1) + 1

  const rows = filteredIds.map((mediaId, idx) => ({
    listing_id: listingId,
    media_id: mediaId,
    tenant_id: entity.tenant_id,
    sort_order: startOrder + idx,
    is_hero: false,
  }))

  const { error: insertErr } = await supabase
    .from('listing_media')
    .upsert(rows, { onConflict: 'listing_id,media_id', ignoreDuplicates: true })

  if (insertErr) return { success: false, error: insertErr.message }

  try {
    await logAudit({
      context: { tenantId: entity.tenant_id, userId: bootstrap.user!.id },
      action: 'listing_media.attached',
      entityType: 'listing_media',
      entityId: entity.id,
      newData: { count: filteredIds.length },
    })
  } catch {}

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/gallery/${entity.id}`)
  }

  return { success: true, added: filteredIds.length }
}

const DetachSchema = z.object({
  entityId: z.string().min(1),
  pivotId: z.string().min(1),
})

export async function detachListingMediaAction(
  input: z.input<typeof DetachSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = DetachSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  const { error } = await supabase
    .from('listing_media')
    .delete()
    .eq('id', parsed.data.pivotId)
    .eq('tenant_id', entity.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/gallery/${entity.id}`)
  }
  return { success: true }
}

const SetHeroSchema = z.object({
  entityId: z.string().min(1),
  mediaId: z.string().min(1).nullable(),
})

export async function setListingHeroAction(
  input: z.input<typeof SetHeroSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SetHeroSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  const listingId = await getOrCreateListing(supabase, entity.id, entity.tenant_id)
  if (!listingId) return { success: false, error: 'LISTING_CREATE_FAILED' }

  // Verify media belongs to tenant when not null
  if (parsed.data.mediaId) {
    const { data: m } = await supabase
      .from('media')
      .select('id')
      .eq('id', parsed.data.mediaId)
      .eq('tenant_id', entity.tenant_id)
      .maybeSingle()
    if (!m) return { success: false, error: 'MEDIA_NOT_FOUND' }
  }

  const { error: updErr } = await supabase
    .from('public_listings')
    .update({ hero_media_id: parsed.data.mediaId })
    .eq('id', listingId)

  if (updErr) return { success: false, error: updErr.message }

  // Sync is_hero flag in pivot
  await supabase
    .from('listing_media')
    .update({ is_hero: false })
    .eq('listing_id', listingId)

  if (parsed.data.mediaId) {
    await supabase
      .from('listing_media')
      .update({ is_hero: true })
      .eq('listing_id', listingId)
      .eq('media_id', parsed.data.mediaId)
  }

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/gallery/${entity.id}`)
  }

  return { success: true }
}

const ReorderSchema = z.object({
  entityId: z.string().min(1),
  pivotIds: z.array(z.string().min(1)).max(200),
})

export async function reorderListingMediaAction(
  input: z.input<typeof ReorderSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = ReorderSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  // Update sort_order one-by-one (small N, no need for batch)
  for (let i = 0; i < parsed.data.pivotIds.length; i++) {
    await supabase
      .from('listing_media')
      .update({ sort_order: i })
      .eq('id', parsed.data.pivotIds[i])
      .eq('tenant_id', entity.tenant_id)
  }

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/gallery/${entity.id}`)
  }

  return { success: true }
}

const AttachVideoSchema = z.object({
  entityId: z.string().min(1),
  url: z.string().url().max(500),
  caption: z.string().max(500).nullable().optional(),
})

export async function attachVideoLinkAction(
  input: z.input<typeof AttachVideoSchema>
): Promise<{ success: boolean; error?: string; mediaId?: string }> {
  const parsed = AttachVideoSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const link = parseVideoLink(parsed.data.url)
  if (!link) return { success: false, error: 'INVALID_VIDEO_URL' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  const listingId = await getOrCreateListing(supabase, entity.id, entity.tenant_id)
  if (!listingId) return { success: false, error: 'LISTING_CREATE_FAILED' }

  const title = await fetchVideoTitle(link)

  const { data: existingMedia } = await supabase
    .from('media')
    .select('id')
    .eq('tenant_id', entity.tenant_id)
    .eq('video_platform', link.platform)
    .eq('video_id', link.videoId)
    .maybeSingle()

  let mediaId = existingMedia?.id as string | undefined

  if (!mediaId) {
    const { data: newMedia, error: mediaErr } = await supabase
      .from('media')
      .insert({
        tenant_id: entity.tenant_id,
        filename: `${link.platform}-${link.videoId}`,
        original_name: title ?? `${link.platform} video`,
        mime_type: `video/${link.platform}`,
        size_bytes: 0,
        r2_key: '',
        r2_bucket: '',
        url: link.embedUrl,
        alt_text: title ?? null,
        video_platform: link.platform,
        video_id: link.videoId,
        video_thumbnail_url: link.thumbnailUrl,
        video_title: title,
      })
      .select('id')
      .single()
    if (mediaErr || !newMedia) return { success: false, error: mediaErr?.message ?? 'MEDIA_INSERT_FAILED' }
    mediaId = newMedia.id as string
  }

  const { data: lastRow } = await supabase
    .from('listing_media')
    .select('sort_order')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (lastRow?.sort_order ?? -1) + 1

  const { error: pivotErr } = await supabase
    .from('listing_media')
    .upsert(
      {
        listing_id: listingId,
        media_id: mediaId,
        tenant_id: entity.tenant_id,
        sort_order: nextOrder,
        is_hero: false,
        media_kind: 'video',
        caption: parsed.data.caption ?? null,
      },
      { onConflict: 'listing_id,media_id', ignoreDuplicates: false }
    )

  if (pivotErr) return { success: false, error: pivotErr.message }

  try {
    await logAudit({
      context: { tenantId: entity.tenant_id, userId: bootstrap.user!.id },
      action: 'listing_media.video_attached',
      entityType: 'listing_media',
      entityId: entity.id,
      newData: { platform: link.platform, video_id: link.videoId },
    })
  } catch {}

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/gallery/${entity.id}`)
  }

  return { success: true, mediaId }
}

const CaptionSchema = z.object({
  entityId: z.string().min(1),
  pivotId: z.string().min(1),
  caption: z.string().max(500).nullable(),
})

export async function updateListingMediaCaptionAction(
  input: z.input<typeof CaptionSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = CaptionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const guard = await ensureEntityOwnership(parsed.data.entityId)
  if (!guard.ok) return { success: false, error: guard.error }
  const { supabase, entity, bootstrap } = guard

  const { error } = await supabase
    .from('listing_media')
    .update({ caption: parsed.data.caption })
    .eq('id', parsed.data.pivotId)
    .eq('tenant_id', entity.tenant_id)
  if (error) return { success: false, error: error.message }

  revalidateListing({
    entityId: entity.id,
    tenantId: entity.tenant_id,
    tenantSlug: bootstrap.tenant?.slug ?? undefined,
    entitySlug: entity.slug,
  })
  if (bootstrap.tenant?.slug) {
    revalidatePath(`/s/${bootstrap.tenant.slug}/${entity.slug}`)
  }
  return { success: true }
}
