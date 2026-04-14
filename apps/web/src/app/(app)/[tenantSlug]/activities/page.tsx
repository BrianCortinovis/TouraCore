import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { Building2 } from 'lucide-react'

interface ActivitiesListProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function ActivitiesList({ params }: ActivitiesListProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Esperienze</h1>
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Modulo Esperienze</h3>
        <p className="mt-2 text-sm text-gray-500">
          Il modulo esperienze sarà disponibile in una milestone futura.
        </p>
      </div>
    </div>
  )
}
