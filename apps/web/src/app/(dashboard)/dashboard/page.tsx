'use client'

import { useAuthStore } from '@touracore/auth/store'
import { Card, CardHeader, CardTitle, CardContent } from '@touracore/ui'

export default function DashboardPage() {
  const { user, profile, tenant, property, staff, properties, tenants } = useAuthStore()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Utente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Nome</dt>
                <dd className="font-medium">{profile?.display_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user?.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Lingua</dt>
                <dd className="font-medium">{profile?.locale ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>La tua attività</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Attuale</dt>
                <dd className="font-medium">{tenant?.name ?? 'Nessuna attività'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Totale attività</dt>
                <dd className="font-medium">{tenants.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Struttura</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Attuale</dt>
                <dd className="font-medium">{property?.name ?? 'Nessuna struttura'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Ruolo</dt>
                <dd className="font-medium">{staff?.role ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Totale strutture</dt>
                <dd className="font-medium">{properties.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
