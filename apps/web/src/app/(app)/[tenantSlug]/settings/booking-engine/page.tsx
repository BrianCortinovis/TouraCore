import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { buildPropertyServicePreviewData } from '@touracore/hospitality/src/config/property-service-preview'
import { BookingEngineClient } from './booking-engine-client'
import type { Property } from '@touracore/hospitality/src/types/database'

interface BookingEnginePageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function BookingEnginePage({ params }: BookingEnginePageProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: property } = await supabase
    .from('entities')
    .select('id, tenant_id, name, slug, short_description, is_active, accommodation:accommodations(*)')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const accommodation = property?.accommodation as unknown as Record<string, unknown> | null
  const previewData = property && accommodation
    ? buildPropertyServicePreviewData({
        propertyName: property.name,
        propertyType: (accommodation.property_type as Property['type']) ?? 'hotel',
        settings: (accommodation.settings as Property['settings']) ?? {},
        petsAllowed: (accommodation.pets_allowed as boolean | undefined) ?? false,
        petPolicy: (accommodation.pet_policy as Property['pet_policy']) ?? {},
        visibility: 'all',
      })
    : null

  return (
    <BookingEngineClient
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      property={
        property && accommodation
          ? {
              id: property.id,
              name: property.name,
              slug: property.slug,
              short_description: property.short_description,
              type: (accommodation.property_type as Property['type']) ?? 'hotel',
            }
          : null
      }
      previewData={previewData}
    />
  )
}
