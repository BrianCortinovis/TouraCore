import { createServerSupabaseClient } from '@touracore/db/server'
import RoomTypesPage from '../../../../../(dashboard)/room-types/page'

interface PageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function EntityRoomTypesPage({ params }: PageProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  const { data: entity } = tenant
    ? await supabase
        .from('entities')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('slug', entitySlug)
        .single()
    : { data: null }

  const { data: accommodation } = entity
    ? await supabase
        .from('accommodations')
        .select('property_type')
        .eq('entity_id', entity.id)
        .maybeSingle()
    : { data: null }

  return <RoomTypesPage propertyType={accommodation?.property_type ?? null} />
}
