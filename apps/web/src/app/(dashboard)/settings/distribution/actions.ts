'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { logAudit } from '@touracore/audit'
import { z } from 'zod'
import { revalidateListing } from '@/lib/cache-tags'

export type DistributionEntityRow = {
  entity_id: string
  entity_slug: string
  entity_name: string
  entity_kind: string
  is_active: boolean
  listing_id: string | null
  is_public: boolean
  tagline: string | null
  featured_amenities: string[] | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  updated_at: string | null
}

const ToggleSchema = z.object({
  entityId: z.string().min(1),
  isPublic: z.boolean(),
})

const UpdateCurationSchema = z.object({
  entityId: z.string().min(1),
  tagline: z.string().max(500).nullable().optional(),
  featuredAmenities: z.array(z.string()).max(20).optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
})

export async function listDistributionEntitiesAction(): Promise<{
  success: boolean
  rows?: DistributionEntityRow[]
  tenantSlug?: string
  error?: string
}> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    return { success: false, error: 'TENANT_REQUIRED' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: entities, error: entError } = await supabase
    .from('entities')
    .select('id, slug, name, kind, is_active')
    .eq('tenant_id', bootstrap.tenant.id)
    .order('kind', { ascending: true })
    .order('name', { ascending: true })

  if (entError || !entities) {
    return { success: false, error: entError?.message ?? 'LOAD_FAILED' }
  }

  const entityIds = entities.map((e) => e.id)
  const { data: listings } = await supabase
    .from('public_listings')
    .select('id, entity_id, is_public, tagline, featured_amenities, seo_title, seo_description, published_at, updated_at')
    .in('entity_id', entityIds.length ? entityIds : ['00000000-0000-0000-0000-000000000000'])

  const listingByEntity = new Map(
    (listings ?? []).map((l) => [l.entity_id, l])
  )

  const rows: DistributionEntityRow[] = entities.map((e) => {
    const l = listingByEntity.get(e.id)
    return {
      entity_id: e.id,
      entity_slug: e.slug,
      entity_name: e.name,
      entity_kind: e.kind,
      is_active: e.is_active,
      listing_id: l?.id ?? null,
      is_public: l?.is_public ?? false,
      tagline: l?.tagline ?? null,
      featured_amenities: (l?.featured_amenities as string[] | null) ?? null,
      seo_title: l?.seo_title ?? null,
      seo_description: l?.seo_description ?? null,
      published_at: l?.published_at ?? null,
      updated_at: l?.updated_at ?? null,
    }
  })

  return { success: true, rows, tenantSlug: bootstrap.tenant.slug ?? undefined }
}

export async function togglePublicListingAction(
  input: z.input<typeof ToggleSchema>
): Promise<{ success: boolean; error?: string; isPublic?: boolean }> {
  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const { entityId, isPublic } = parsed.data
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) {
    return { success: false, error: 'TENANT_REQUIRED' }
  }

  const supabase = await createServerSupabaseClient()

  // Verify entity belongs to current tenant
  const { data: entity, error: entErr } = await supabase
    .from('entities')
    .select('id, slug, tenant_id')
    .eq('id', entityId)
    .eq('tenant_id', bootstrap.tenant.id)
    .maybeSingle()

  if (entErr || !entity) {
    return { success: false, error: 'ENTITY_NOT_FOUND' }
  }

  // Stripe Connect gating: per pubblicare serve charges_enabled
  if (isPublic) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_connect_charges_enabled')
      .eq('id', entity.tenant_id)
      .maybeSingle()
    const ok = (tenant as { stripe_connect_charges_enabled: boolean } | null)?.stripe_connect_charges_enabled === true
    if (!ok) {
      return { success: false, error: 'STRIPE_CONNECT_REQUIRED' }
    }
  }

  // Upsert public_listing
  const { error: upsertErr } = await supabase
    .from('public_listings')
    .upsert(
      {
        entity_id: entity.id,
        tenant_id: entity.tenant_id,
        is_public: isPublic,
      },
      { onConflict: 'entity_id' }
    )

  if (upsertErr) {
    return { success: false, error: upsertErr.message }
  }

  // Audit log (best-effort)
  try {
    await logAudit({
      context: { tenantId: bootstrap.tenant.id, userId: bootstrap.user.id },
      action: isPublic ? 'public_listing_published' : 'public_listing_unpublished',
      entityType: 'public_listing',
      entityId: entity.id,
      newData: { entity_slug: entity.slug, is_public: isPublic },
    })
  } catch {
    // non-critical
  }

  // Tag-based revalidation: instant invalidation across listing page,
  // discover aggregator, and sitemap.
  const tenantSlug = bootstrap.tenant.slug
  revalidateListing({
    entityId: entity.id,
    tenantId: bootstrap.tenant.id,
    tenantSlug: tenantSlug ?? undefined,
    entitySlug: entity.slug,
  })
  if (tenantSlug) {
    revalidatePath(`/s/${tenantSlug}/${entity.slug}`)
    revalidatePath('/sitemap-listings.xml')
    revalidatePath('/discover')
  }

  return { success: true, isPublic }
}

export async function updateListingCurationAction(
  input: z.input<typeof UpdateCurationSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateCurationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant || !bootstrap.user) return { success: false, error: 'TENANT_REQUIRED' }

  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, tenant_id')
    .eq('id', parsed.data.entityId)
    .eq('tenant_id', bootstrap.tenant.id)
    .maybeSingle()
  if (!entity) return { success: false, error: 'ENTITY_NOT_FOUND' }

  const updates: Record<string, unknown> = {
    entity_id: entity.id,
    tenant_id: entity.tenant_id,
  }
  if (parsed.data.tagline !== undefined) updates.tagline = parsed.data.tagline
  if (parsed.data.featuredAmenities !== undefined) updates.featured_amenities = parsed.data.featuredAmenities
  if (parsed.data.seoTitle !== undefined) updates.seo_title = parsed.data.seoTitle
  if (parsed.data.seoDescription !== undefined) updates.seo_description = parsed.data.seoDescription

  const { error } = await supabase
    .from('public_listings')
    .upsert(updates, { onConflict: 'entity_id' })

  if (error) return { success: false, error: error.message }

  try {
    await logAudit({
      context: { tenantId: bootstrap.tenant.id, userId: bootstrap.user.id },
      action: 'public_listing_curation_updated',
      entityType: 'public_listing',
      entityId: entity.id,
      newData: parsed.data as Record<string, unknown>,
    })
  } catch {}

  const tenantSlug = bootstrap.tenant.slug
  revalidateListing({
    entityId: entity.id,
    tenantId: bootstrap.tenant.id,
    tenantSlug: tenantSlug ?? undefined,
    entitySlug: entity.slug,
  })
  if (tenantSlug) {
    revalidatePath(`/s/${tenantSlug}/${entity.slug}`)
  }

  return { success: true }
}
