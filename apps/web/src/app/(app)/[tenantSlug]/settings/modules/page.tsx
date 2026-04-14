import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { Home, Bike } from 'lucide-react'

interface ModulesSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function ModulesSettingsPage({ params }: ModulesSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const modules = (tenant.modules as { hospitality?: boolean; experiences?: boolean }) ?? {}
  const hospitalityEnabled = modules.hospitality ?? true
  const experiencesEnabled = modules.experiences ?? false

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Moduli attivi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Attiva le aree operative del tuo account
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Ospitalità</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    hospitalityEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {hospitalityEnabled ? 'Attivo' : 'Disattivato'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Gestisci strutture ricettive (case vacanze, hotel, B&amp;B, agriturismi).
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-purple-50 p-2">
              <Bike className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Attività</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    experiencesEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {experiencesEnabled ? 'Attivo' : 'In arrivo'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Noleggio bici, tour guidati, esperienze e attività outdoor.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
        <p className="text-sm text-gray-500">
          Il toggle per attivare/disattivare i moduli sarà disponibile a breve.
        </p>
      </div>
    </div>
  )
}
