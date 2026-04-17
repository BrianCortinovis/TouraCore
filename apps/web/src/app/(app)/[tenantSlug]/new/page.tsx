import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { Hotel, UtensilsCrossed, Sparkles, MapPin, Bike, Snowflake } from 'lucide-react'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

const MODULE_ICONS: Record<ModuleCode, React.ElementType> = {
  hospitality: Hotel,
  restaurant: UtensilsCrossed,
  wellness: Sparkles,
  experiences: MapPin,
  bike_rental: Bike,
  moto_rental: Bike,
  ski_school: Snowflake,
}

const MODULE_TO_NEW_ROUTE: Record<ModuleCode, string> = {
  hospitality: 'stays/new',
  restaurant: 'dine/new',
  wellness: 'wellness/new',
  experiences: 'activities/new',
  bike_rental: 'bike/new',
  moto_rental: 'moto/new',
  ski_school: 'ski/new',
}

export default async function NewEntityHub({ params }: Props) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()
  const admin = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const modules = (tenant.modules ?? {}) as Record<string, { active: boolean }>
  const activeCodes = (Object.keys(modules) as ModuleCode[]).filter((k) => modules[k]?.active)

  // Se ha solo 1 modulo attivo, redirect diretto
  if (activeCodes.length === 1) {
    const only = activeCodes[0]!
    redirect(`/${tenantSlug}/${MODULE_TO_NEW_ROUTE[only]}`)
  }

  if (activeCodes.length === 0) {
    redirect(`/${tenantSlug}/settings/modules`)
  }

  const { data: catalog } = await admin
    .from('module_catalog')
    .select('code, label, description, entity_kind')
    .in('code', activeCodes)
    .order('order_idx', { ascending: true })

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crea nuova entity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scegli il tipo di entity da creare in base ai moduli attivi.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(catalog ?? []).map((m) => {
          const code = m.code as ModuleCode
          const Icon = MODULE_ICONS[code]
          const route = MODULE_TO_NEW_ROUTE[code]
          return (
            <Link
              key={m.code}
              href={`/${tenantSlug}/${route}`}
              className="group rounded-lg border-2 border-gray-200 bg-white p-5 transition-all hover:border-blue-600 hover:bg-blue-50/40"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 group-hover:bg-blue-100">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-900">{m.label}</span>
              </div>
              {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
