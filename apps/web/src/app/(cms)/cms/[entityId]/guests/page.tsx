'use client'

import { Card, CardContent } from '@touracore/ui'
import { Users } from 'lucide-react'

export default function CmsPropertyGuestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ospiti</h1>
        <p className="mt-1 text-sm text-gray-500">Registro ospiti e comunicazioni</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            La gestione ospiti sarà disponibile prossimamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
