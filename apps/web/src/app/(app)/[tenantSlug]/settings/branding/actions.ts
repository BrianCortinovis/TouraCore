'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { logAudit } from '@touracore/audit'
import { revalidateListing } from '@/lib/cache-tags'
import { revalidatePath } from 'next/cache'

export type TenantBrandingState = {
  tenantId: string
  tenantSlug: string
  tenantName: string
  brandColor: string | null
  logo: { id: string; url: string } | null
  cover: { id: string; url: string } | null
}

export async function loadTenantBrandingAction(): Promise<{
  success: boolean
  data?: TenantBrandingState
  error?: string
}> {
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user || !bootstrap.tenant) {
    return { success: false, error: 'TENANT_REQUIRED' }
  }
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, brand_color, logo_media_id, cover_media_id')
    .eq('id', bootstrap.tenant.id)
    .maybeSingle()

  if (!tenant) return { success: false, error: 'TENANT_NOT_FOUND' }

  const mediaIds = [tenant.logo_media_id, tenant.cover_media_id].filter(
    (id): id is string => Boolean(id)
  )
  let mediaMap = new Map<string, { url: string }>()
  if (mediaIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from('media')
      .select('id, url')
      .in('id', mediaIds)
    mediaMap = new Map((mediaRows ?? []).map((m) => [m.id, { url: m.url }]))
  }

  return {
    success: true,
    data: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      brandColor: (tenant.brand_color as string | null) ?? null,
      logo: tenant.logo_media_id
        ? { id: tenant.logo_media_id, url: mediaMap.get(tenant.logo_media_id)?.url ?? '' }
        : null,
      cover: tenant.cover_media_id
        ? { id: tenant.cover_media_id, url: mediaMap.get(tenant.cover_media_id)?.url ?? '' }
        : null,
    },
  }
}

const SaveSchema = z.object({
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Hex non valido')
    .nullable(),
  logoMediaId: z.string().uuid().nullable(),
  coverMediaId: z.string().uuid().nullable(),
})

export async function saveTenantBrandingAction(
  input: z.input<typeof SaveSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SaveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'INVALID_INPUT' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.user || !bootstrap.tenant) {
    return { success: false, error: 'TENANT_REQUIRED' }
  }
  const supabase = await createServerSupabaseClient()

  const idsToCheck = [parsed.data.logoMediaId, parsed.data.coverMediaId].filter(
    (id): id is string => Boolean(id)
  )
  if (idsToCheck.length > 0) {
    const { data: owned } = await supabase
      .from('media')
      .select('id')
      .eq('tenant_id', bootstrap.tenant.id)
      .in('id', idsToCheck)
    const ownedSet = new Set((owned ?? []).map((m) => m.id))
    if (idsToCheck.some((id) => !ownedSet.has(id))) {
      return { success: false, error: 'MEDIA_NOT_OWNED' }
    }
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      brand_color: parsed.data.brandColor,
      logo_media_id: parsed.data.logoMediaId,
      cover_media_id: parsed.data.coverMediaId,
    })
    .eq('id', bootstrap.tenant.id)

  if (error) return { success: false, error: error.message }

  try {
    await logAudit({
      context: { tenantId: bootstrap.tenant.id, userId: bootstrap.user.id },
      action: 'tenant.branding_updated',
      entityType: 'tenant',
      entityId: bootstrap.tenant.id,
      newData: parsed.data as Record<string, unknown>,
    })
  } catch {}

  revalidateListing({
    tenantId: bootstrap.tenant.id,
    tenantSlug: bootstrap.tenant.slug ?? undefined,
  })
  if (bootstrap.tenant.slug) {
    revalidatePath(`/book/multi/${bootstrap.tenant.slug}`)
    revalidatePath(`/${bootstrap.tenant.slug}/settings/branding`)
  }

  return { success: true }
}
