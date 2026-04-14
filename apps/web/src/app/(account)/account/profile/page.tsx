'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { Button, Input, Select } from '@touracore/ui'
import { updateProfileAction } from './actions'

const LOCALE_OPTIONS = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Rome', label: 'Roma (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurigo (CET/CEST)' },
  { value: 'Europe/Paris', label: 'Parigi (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlino (CET/CEST)' },
  { value: 'Europe/London', label: 'Londra (GMT/BST)' },
]

export default function AccountProfilePage() {
  const { user, profile } = useAuthStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [locale, setLocale] = useState(profile?.locale ?? 'it')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Europe/Rome')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const result = await updateProfileAction({
      display_name: displayName,
      locale,
      timezone,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Profilo aggiornato con successo.' })
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
    }
    setIsLoading(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Il tuo profilo</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci le informazioni del tuo account personale</p>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome completo"
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Mario Rossi"
        />

        <Input
          label="Email di accesso"
          id="email"
          value={user?.email ?? ''}
          readOnly
          disabled
          className="bg-gray-50"
        />

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            Per cambiare la password, usa la funzione{' '}
            <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">
              Recupera password
            </a>
          </p>
        </div>

        <Select
          label="Lingua interfaccia"
          id="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          options={LOCALE_OPTIONS}
        />

        <Select
          label="Fuso orario"
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          options={TIMEZONE_OPTIONS}
        />

        <div className="pt-4">
          <Button type="submit" isLoading={isLoading}>
            Salva profilo
          </Button>
        </div>
      </form>
    </div>
  )
}
