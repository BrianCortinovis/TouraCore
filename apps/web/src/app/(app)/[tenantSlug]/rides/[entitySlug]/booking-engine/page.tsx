import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { BikeBookingEngineAdmin } from './booking-engine-admin'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function BikeBookingEnginePage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .eq('kind', 'bike_rental')
    .maybeSingle()
  if (!entity) notFound()

  return (
    <div className="space-y-4 px-5 py-4">
      <header>
        <h1 className="text-xl font-semibold">Widget prenotazioni · {entity.name}</h1>
        <p className="text-xs text-slate-500">
          Anteprima del widget di noleggio bike visibile ai clienti. Il flusso è single-page con sezioni
          scorrevoli: data ritiro/rientro → punti ritiro → tipi di bike → extra → dati cliente.
        </p>
      </header>
      <BikeBookingEngineAdmin slug={entity.slug} />
    </div>
  )
}
