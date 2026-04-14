import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { PlanningContainer } from './planning-container'

interface PlanningPageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function PlanningPage({ params }: PlanningPageProps) {
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
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  return <PlanningContainer entityId={entity.id} entityName={entity.name} />
}
