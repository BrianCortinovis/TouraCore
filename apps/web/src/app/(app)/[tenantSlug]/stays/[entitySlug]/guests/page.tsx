import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { GuestsClient } from './guests-client'

interface GuestsPageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  return <GuestsClient entityId={entity.id} />
}
