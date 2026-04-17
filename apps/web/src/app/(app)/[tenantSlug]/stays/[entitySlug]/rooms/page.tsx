import { createServerSupabaseClient } from '@touracore/db/server'
import RoomsPage from '../../../../../(dashboard)/rooms/page'

interface PageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function EntityRoomsPage({ params }: PageProps) {
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

  return <RoomsPage propertyType={accommodation?.property_type ?? null} />
}
