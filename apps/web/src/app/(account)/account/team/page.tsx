'use client'

import { Card, CardContent, Button } from '@touracore/ui'
import { Users } from 'lucide-react'

export default function AccountTeamPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci i collaboratori della tua attività</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            La gestione del team sarà disponibile a breve.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Potrai invitare collaboratori e assegnare ruoli e permessi.
          </p>
          <Button className="mt-4" disabled>
            Invita collaboratore
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
