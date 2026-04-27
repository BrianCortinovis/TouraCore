import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { NewBikeRentalForm } from './new-bike-rental-form'

interface NewRideProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function NewBikeRentalPage({ params }: NewRideProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuovo punto noleggio</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea un nuovo punto di noleggio bici / e-bike. Configurerai mezzi e tariffe nel passo successivo.
        </p>
      </div>
      <NewBikeRentalForm tenantSlug={tenantSlug} />
    </div>
  )
}
