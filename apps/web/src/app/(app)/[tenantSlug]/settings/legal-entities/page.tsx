import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { LegalEntitiesClient } from './legal-entities-client'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function LegalEntitiesPage({ params }: Props) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entities } = await supabase
    .from('legal_entities')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  const { data: linkedEntities } = await supabase
    .from('entities')
    .select('id, name, kind, legal_entity_id, slug')
    .eq('tenant_id', tenant.id)
    .order('name')

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soggetti fiscali</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cappelli fiscali emittenti documenti. Italia: privato (solo hospitality), business (P.IVA), occasionale (≤€5k/anno).
          </p>
        </div>
      </header>

      <LegalEntitiesClient
        tenantId={tenant.id as string}
        tenantSlug={tenantSlug}
        legalEntities={entities ?? []}
        linkedEntities={linkedEntities ?? []}
      />
    </div>
  )
}
