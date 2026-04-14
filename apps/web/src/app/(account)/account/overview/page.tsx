'use client'

import Link from 'next/link'
import { useAuthStore } from '@touracore/auth/store'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { Building2, LayoutDashboard } from 'lucide-react'

export default function AccountOverviewPage() {
  const { profile, tenant, properties } = useAuthStore()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Benvenuto{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestisci il tuo account e le tue strutture
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-600" />
              Strutture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
            <p className="mt-1 text-sm text-gray-500">
              {properties.length === 1 ? 'struttura registrata' : 'strutture registrate'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
              Attività
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{tenant?.name ?? '—'}</p>
            <p className="mt-1 text-sm text-gray-500">La tua attività</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/account/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Building2 className="h-4 w-4" />
          Crea nuova struttura
        </Link>
        {properties.length > 0 && (
          <Link
            href={`/${tenant?.slug}/stays/${properties[0]?.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LayoutDashboard className="h-4 w-4" />
            Apri il gestionale
          </Link>
        )}
      </div>
    </div>
  )
}
