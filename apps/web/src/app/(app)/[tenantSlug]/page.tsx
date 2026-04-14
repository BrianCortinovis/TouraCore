import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'

interface TenantHomeProps {
  params: Promise<{ tenantSlug: string }>
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

  const modules = (tenant.modules as Record<string, boolean>) ?? { hospitality: true }
  const hasHospitality = modules.hospitality === true
  const hasExperiences = modules.experiences === true

  // Se solo hospitality, redirect diretto a stays
  if (hasHospitality && !hasExperiences) {
    redirect(`/${tenantSlug}/stays`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {hasHospitality && (
          <Link href={`/${tenantSlug}/stays`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Strutture ricettive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Gestisci le tue strutture: prenotazioni, tariffe, ospiti e operazioni.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {hasExperiences && (
          <Link href={`/${tenantSlug}/activities`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-green-600" />
                  Esperienze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  In arrivo. Gestisci tour, escursioni e attività per i tuoi ospiti.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
