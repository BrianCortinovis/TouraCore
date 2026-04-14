'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { updateProfile, type UpdateProfileInput } from '../../profile/actions'

const LOCALE_OPTIONS = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Rome', label: 'Roma (CET/CEST)' },
  { value: 'Europe/London', label: 'Londra (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlino (CET/CEST)' },
  { value: 'Europe/Paris', label: 'Parigi (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

export function ProfileTab() {
  const { user, profile, setProfile } = useAuthStore()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [locale, setLocale] = useState(profile?.locale ?? 'it')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Europe/Rome')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const input: UpdateProfileInput = {
      display_name: displayName,
      avatar_url: profile?.avatar_url ?? null,
      locale: locale as UpdateProfileInput['locale'],
      timezone,
    }

    startTransition(async () => {
      const result = await updateProfile(input)
      if (result.success) {
        setMessage({ type: 'success', text: 'Profilo aggiornato con successo.' })
        if (profile) {
          setProfile({ ...profile, display_name: displayName, locale, timezone })
        }
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">I tuoi dati</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="profile-name"
            label="Nome completo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mario Rossi"
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Email di accesso</label>
            <p className="flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
              {user?.email ?? '—'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Preferenze</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="profile-locale"
            label="Lingua dell'interfaccia"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            options={LOCALE_OPTIONS}
          />
          <Select
            id="profile-timezone"
            label="Fuso orario"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
        </div>
      </section>

      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending} isLoading={isPending}>
          {isPending ? 'Salvataggio...' : 'Salva profilo'}
        </Button>
      </div>
    </form>
  )
}
