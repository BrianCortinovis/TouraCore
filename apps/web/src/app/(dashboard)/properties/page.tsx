'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, Badge, Card, CardContent } from '@touracore/ui'
import { listPropertiesAction } from './actions'

interface PropertySummary {
  id: string
  name: string
  type: string
  city: string | null
  province: string | null
  is_active: boolean
  logo_url: string | null
  short_description: string | null
  address: string | null
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  b_and_b: 'B&B',
  apartment: 'Casa vacanze',
  agriturismo: 'Agriturismo',
  residence: 'Residence',
  affittacamere: 'Affittacamere',
  mixed: 'Altro',
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listPropertiesAction()
      if (result.success && Array.isArray(result.data)) {
        setProperties(result.data as PropertySummary[])
      }
    } catch {
      // Errore gestito dal error boundary
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Le tue strutture</h1>
        <Link href="/properties/new">
          <Button>Nuova struttura</Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Nessuna struttura</h3>
            <p className="mt-1 text-sm text-gray-500">
              Crea la tua prima struttura per iniziare a gestire camere, tariffe e prenotazioni.
            </p>
            <Link href="/properties/new" className="mt-4 inline-block">
              <Button>Crea la tua prima struttura</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{p.name}</h3>
                      <p className="text-sm text-gray-500">{TYPE_LABELS[p.type] ?? p.type}</p>
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Attiva' : 'Inattiva'}
                    </Badge>
                  </div>
                  {p.short_description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{p.short_description}</p>
                  )}
                  {(p.city || p.address) && (
                    <p className="text-xs text-gray-400">
                      {[p.address, p.city, p.province].filter(Boolean).join(', ')}
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
