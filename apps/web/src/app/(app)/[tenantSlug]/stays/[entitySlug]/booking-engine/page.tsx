import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { buildPropertyServicePreviewData } from '@touracore/hospitality/src/config/property-service-preview'
import { BookingEngineClient } from '../../../settings/booking-engine/booking-engine-client'
import type { PropertyType } from '@touracore/hospitality/src/types/database'

interface BookingEnginePageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function BookingEnginePage({ params }: BookingEnginePageProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, description, tenant_id')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('property_type, settings, pet_policy, pets_allowed, short_description')
    .eq('entity_id', entity.id)
    .maybeSingle()

  const propertyType = (accommodation?.property_type ?? 'hotel') as PropertyType
  const previewData = buildPropertyServicePreviewData({
    propertyName: entity.name,
    propertyType,
    settings: accommodation?.settings ?? null,
    petsAllowed: accommodation?.pets_allowed ?? false,
    petPolicy: accommodation?.pet_policy ?? null,
    visibility: 'all',
  })

  return (
    <BookingEngineClient
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      property={{
        id: entity.id,
        name: entity.name,
        slug: entity.slug,
        type: propertyType,
        short_description: accommodation?.short_description ?? entity.description ?? null,
      }}
      previewData={previewData}
    />
  )
}
