'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { logAudit } from '@touracore/audit'
import { z } from 'zod'

export type DistributionEntityRow = {
  entity_id: string
  entity_slug: string
  entity_name: string
  entity_kind: string
  is_active: boolean
  listing_id: string | null
  is_public: boolean
  tagline: string | null
  published_at: string | null
  updated_at: string | null
}

const ToggleSchema = z.object({
  entityId: z.string().min(1),
  isPublic: z.boolean(),
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
    .select('id, entity_id, is_public, tagline, published_at, updated_at')
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

  // Trigger ISR revalidation for affected public page
  const tenantSlug = bootstrap.tenant.slug
  if (tenantSlug) {
    revalidatePath(`/s/${tenantSlug}/${entity.slug}`)
    revalidatePath('/sitemap-listings.xml')
  }

  return { success: true, isPublic }
}
