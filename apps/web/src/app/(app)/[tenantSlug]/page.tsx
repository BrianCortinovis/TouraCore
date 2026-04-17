import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Compass, UtensilsCrossed, BarChart3, FileText, Plug } from 'lucide-react'

interface TenantHomeProps {
  params: Promise<{ tenantSlug: string }>
}

type ModuleState = { active?: boolean; source?: string; since?: string } | boolean

function isModuleActive(m: ModuleState | undefined): boolean {
  if (m === undefined || m === null) return false
  if (typeof m === 'boolean') return m
  return m.active === true
}

export default async function TenantHome({ params }: TenantHomeProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const modules = (tenant.modules as Record<string, ModuleState>) ?? {}
  const hasHospitality = isModuleActive(modules.hospitality)
  const hasRestaurant = isModuleActive(modules.restaurant)
  const hasExperiences = isModuleActive(modules.experiences)
  const hasWellness = isModuleActive(modules.wellness)
  const hasBike = isModuleActive(modules.bike_rental)

  const activeCount = [hasHospitality, hasRestaurant, hasExperiences, hasWellness, hasBike].filter(Boolean).length

  // Se solo hospitality attivo, redirect diretto
  if (activeCount === 1 && hasHospitality) {
    redirect(`/${tenantSlug}/stays`)
  }
  // Se solo ristorazione attiva, redirect diretto
  if (activeCount === 1 && hasRestaurant) {
    redirect(`/${tenantSlug}/dine`)
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Dashboard multi-vertical</p>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Moduli attivi</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasHospitality && (
            <Link href={`/${tenantSlug}/stays`}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-blue-50 p-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-blue-600">Ospitalità</h3>
                  <p className="mt-1 text-xs text-gray-500">Strutture ricettive, prenotazioni, tariffe, ospiti, compliance IT</p>
                </div>
              </div>
            </Link>
          )}
          {hasRestaurant && (
            <Link href={`/${tenantSlug}/dine`}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-amber-400 hover:shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-amber-50 p-2">
                  <UtensilsCrossed className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-amber-600">Ristorazione</h3>
                  <p className="mt-1 text-xs text-gray-500">Sale, prenotazioni tavolo, POS, menu, KDS, fiscale RT/ADE</p>
                </div>
              </div>
            </Link>
          )}
          {hasExperiences && (
            <Link href={`/${tenantSlug}/activities`}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-green-400 hover:shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-green-50 p-2">
                  <Compass className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-green-600">Esperienze</h3>
                  <p className="mt-1 text-xs text-gray-500">Tour, escursioni, attività guide</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Dashboard cross-vertical</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/${tenantSlug}/consolidated`}
            className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-purple-400">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h3 className="mt-2 font-medium group-hover:text-purple-600">Dashboard consolidato</h3>
            <p className="text-xs text-gray-500">Revenue tot cross-vertical</p>
          </Link>
          <Link href={`/${tenantSlug}/documents`}
            className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-400">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="mt-2 font-medium group-hover:text-blue-600">Documenti fiscali</h3>
            <p className="text-xs text-gray-500">Fatture · Scontrini · SDI</p>
          </Link>
          <Link href={`/${tenantSlug}/settings`}
            className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400">
            <Plug className="h-5 w-5 text-gray-600" />
            <h3 className="mt-2 font-medium group-hover:text-gray-600">Impostazioni</h3>
            <p className="text-xs text-gray-500">Moduli · Loyalty · Billing</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
