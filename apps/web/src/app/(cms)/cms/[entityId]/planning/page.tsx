'use client'

import { Card, CardContent } from '@touracore/ui'
import { CalendarDays } from 'lucide-react'

export default function CmsPropertyPlanningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Planning</h1>
        <p className="mt-1 text-sm text-gray-500">Calendario prenotazioni e disponibilità</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Il planning prenotazioni sarà disponibile prossimamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
