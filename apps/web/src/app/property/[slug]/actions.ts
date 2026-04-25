'use server'

import { createServiceRoleClient } from '@touracore/db/server'
import type { Property, RoomType } from '@touracore/hospitality/src/types/database'

export async function getPublicPropertyAction(slug: string) {
  const supabase = await createServiceRoleClient()

  const { data: property } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!property) return null

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('entity_id', property.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: media } = await supabase
    .from('media')
    .select('id, url, thumbnail_url, alt, width, height, mime_type')
    .eq('tenant_id', property.id)
    .order('created_at', { ascending: false })
    .limit(20)

  let canonicalPath: string | null = null
  if (property.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', property.tenant_id)
      .single()
    if (tenant?.slug && property.slug) {
      canonicalPath = `/s/${tenant.slug}/${property.slug}`
    }
  }

  return {
    property: property as Property,
    roomTypes: (roomTypes ?? []) as RoomType[],
    media: media ?? [],
    canonicalPath,
  }
}
