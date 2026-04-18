import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { CheckinClient } from './checkin-client'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function CheckinPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id, name').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  return <CheckinClient tenantId={tenant.id as string} entityId={entity.id as string} entityName={entity.name as string} />
}
