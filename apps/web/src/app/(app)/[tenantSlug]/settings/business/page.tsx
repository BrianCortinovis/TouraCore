import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'

interface BusinessSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function BusinessSettingsPage({ params }: BusinessSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, country, legal_type, legal_details, billing_customer_id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dati azienda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informazioni legali e fiscali della tua organizzazione
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Nome organizzazione</dt>
            <dd className="mt-1 text-sm text-gray-900">{tenant.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Paese</dt>
            <dd className="mt-1 text-sm text-gray-900">{tenant.country ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Forma giuridica</dt>
            <dd className="mt-1 text-sm text-gray-900">{tenant.legal_type ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">
          Il form di modifica dei dati fiscali sarà disponibile a breve.
        </p>
      </div>
    </div>
  )
}
