import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'

interface StaysListProps {
  params: Promise<{ tenantSlug: string }>
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  b_and_b: 'Bed & Breakfast',
  apartment: 'Casa vacanze',
  agriturismo: 'Agriturismo',
  residence: 'Residence',
  affittacamere: 'Affittacamere',
  mixed: 'Struttura mista',
}

export default async function StaysList({ params }: StaysListProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, is_active, created_at')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'accommodation')
    .order('created_at', { ascending: false })

  // Recupera dati accommodation per ogni entity
  const entityIds = (entities ?? []).map((e) => e.id)
  const { data: accommodations } = entityIds.length > 0
    ? await supabase
        .from('accommodations')
        .select('entity_id, property_type, city')
        .in('entity_id', entityIds)
    : { data: [] }

  const accommodationMap = new Map(
    (accommodations ?? []).map((a) => [a.entity_id, a])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Strutture</h1>
        <Link
          href={`/${tenantSlug}/stays/new`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuova struttura
        </Link>
      </div>

      {(!entities || entities.length === 0) ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna struttura</h3>
          <p className="mt-2 text-sm text-gray-500">
            Inizia creando la tua prima struttura ricettiva.
          </p>
          <Link
            href={`/${tenantSlug}/stays/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crea struttura
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => {
            const acc = accommodationMap.get(entity.id)
            return (
              <Link key={entity.id} href={`/${tenantSlug}/stays/${entity.slug}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{entity.name}</span>
                      <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                        {entity.is_active ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {acc?.property_type && (
                        <span>{TYPE_LABELS[acc.property_type] ?? acc.property_type}</span>
                      )}
                      {acc?.city && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{acc.city}</span>
                        </>
                      )}
                    </div>
                    {entity.management_mode === 'agency_managed' && (
                      <Badge variant="outline" className="mt-2 text-amber-600 border-amber-200 bg-amber-50">
                        Gestita da agenzia
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
