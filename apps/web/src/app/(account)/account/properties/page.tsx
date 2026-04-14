'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, Badge } from '@touracore/ui'
import { Building2, Plus, MapPin } from 'lucide-react'
import { listPropertiesAction } from '../../../(dashboard)/properties/actions'

interface PropertySummary {
  id: string
  name: string
  type: string
  city: string | null
  is_active: boolean
  short_description: string | null
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  b_and_b: 'B&B',
  apartment: 'Appartamento',
  agriturismo: 'Agriturismo',
  residence: 'Residence',
  affittacamere: 'Affittacamere',
  mixed: 'Struttura mista',
}

export default function AccountPropertiesPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await listPropertiesAction()
      if (result.success && result.data) {
        setProperties(result.data as PropertySummary[])
      }
      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Le tue strutture</h1>
          <p className="mt-1 text-sm text-gray-500">Gestisci le strutture della tua attività</p>
        </div>
        <Link
          href="/account/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuova struttura
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Nessuna struttura creata</p>
            <Link
              href="/account/properties/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Crea la tua prima struttura
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => (
            <Link key={prop.id} href={`/cms/${prop.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-gray-900">{prop.name}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {TYPE_LABELS[prop.type] ?? prop.type}
                      </p>
                    </div>
                    <Badge
                      variant={prop.is_active ? 'default' : 'secondary'}
                    >
                      {prop.is_active ? 'Attiva' : 'Inattiva'}
                    </Badge>
                  </div>
                  {prop.city && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {prop.city}
                    </div>
                  )}
                  {prop.short_description && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">
                      {prop.short_description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
