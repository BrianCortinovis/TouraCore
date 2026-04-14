'use client'

import { Card, CardContent } from '@touracore/ui'
import { Mail } from 'lucide-react'

export default function CmsPropertyCommunicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Comunicazioni</h1>
        <p className="mt-1 text-sm text-gray-500">Email e messaggi per i tuoi ospiti</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            La gestione comunicazioni sarà disponibile prossimamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
