'use client'

import { useParams } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'
import { Building2, CalendarCheck, Users, BarChart3, AlertTriangle } from 'lucide-react'
import { COUNTRY_DEFINITIONS, isCountryFullySupported } from '@touracore/legal'
import type { CountryCode } from '@touracore/legal'

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  b_and_b: 'B&B',
  apartment: 'Appartamento',
  agriturismo: 'Agriturismo',
  residence: 'Residence',
  affittacamere: 'Affittacamere',
  mixed: 'Struttura mista',
}

export default function CmsPropertyDashboard() {
  const params = useParams()
  const entityId = params.entityId as string
  const { properties } = useAuthStore()

  const property = properties.find((p) => p.id === entityId)
  const countryCode = ((property?.country_override as string) ?? 'IT') as CountryCode
  const countryDef = COUNTRY_DEFINITIONS[countryCode] ?? COUNTRY_DEFINITIONS.IT
  const isFullySupported = isCountryFullySupported(countryCode)

  if (!property) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Struttura non trovata
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner paese non supportato */}
      {!isFullySupported && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Questa struttura è in {countryDef.name}
            </p>
            <p className="mt-1 text-sm text-yellow-700">
              La gestione fiscale e la compliance locale saranno disponibili a breve. Per ora puoi usare tutte le funzioni universali.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {TYPE_LABELS[property.kind ?? ''] ?? property.kind}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{countryDef.name}</span>
            <Badge variant={property.is_active ? 'default' : 'secondary'}>
              {property.is_active ? 'Attiva' : 'Inattiva'}
            </Badge>
          </div>
        </div>
      </div>

      {/* KPI placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <CalendarCheck className="h-4 w-4" />
              Prenotazioni oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Users className="h-4 w-4" />
              Check-in oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <BarChart3 className="h-4 w-4" />
              Occupazione settimana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Building2 className="h-4 w-4" />
              Check-out oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
