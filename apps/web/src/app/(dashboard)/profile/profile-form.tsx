'use client'

import { useState, useTransition } from 'react'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { Select } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { updateProfile, type UpdateProfileInput } from './actions'

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

export function ProfileForm() {
  const { profile, setProfile } = useAuthStore()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [locale, setLocale] = useState(profile?.locale ?? 'it')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Europe/Rome')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const input: UpdateProfileInput = {
      display_name: displayName,
      avatar_url: avatarUrl || null,
      locale: locale as UpdateProfileInput['locale'],
      timezone,
    }

    startTransition(async () => {
      const result = await updateProfile(input)

      if (result.success) {
        setMessage({ type: 'success', text: 'Profilo aggiornato con successo.' })
        if (profile) {
          setProfile({
            ...profile,
            display_name: displayName,
            avatar_url: avatarUrl || null,
            locale,
            timezone,
          })
        }
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore sconosciuto.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Input
        id="display_name"
        label="Nome visualizzato"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Il tuo nome"
        required
      />

      <Input
        id="avatar_url"
        label="URL Avatar"
        type="url"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="https://esempio.com/avatar.jpg"
      />

      <Select
        id="locale"
        label="Lingua"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        options={LOCALE_OPTIONS}
      />

      <Select
        id="timezone"
        label="Fuso orario"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        options={TIMEZONE_OPTIONS}
      />

      {message && (
        <p className={message.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isPending} isLoading={isPending}>
        {isPending ? 'Salvataggio...' : 'Salva profilo'}
      </Button>
    </form>
  )
}
