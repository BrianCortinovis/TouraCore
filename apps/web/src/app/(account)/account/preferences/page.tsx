'use client'

import { Card, CardContent } from '@touracore/ui'
import { Settings } from 'lucide-react'

export default function AccountPreferencesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Preferenze</h1>
        <p className="mt-1 text-sm text-gray-500">Notifiche, lingua e impostazioni personali</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Le preferenze avanzate saranno disponibili a breve.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Potrai configurare le notifiche, la lingua per le comunicazioni agli ospiti e altre impostazioni.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
