'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@touracore/ui'
import { saveTenantSettingsBatchAction } from '../actions'

interface CommunicationsTabProps {
  settings: Record<string, unknown>
}

const LOCALE_OPTIONS = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'Inglese' },
  { value: 'de', label: 'Tedesco' },
  { value: 'fr', label: 'Francese' },
  { value: 'es', label: 'Spagnolo' },
]

export function CommunicationsTab({ settings }: CommunicationsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [senderEmail, setSenderEmail] = useState((settings['notification.sender_email'] as string) ?? '')
  const [senderName, setSenderName] = useState((settings['notification.sender_name'] as string) ?? '')
  const [signature, setSignature] = useState((settings['notification.signature'] as string) ?? '')
  const [defaultLocale, setDefaultLocale] = useState((settings['notification.default_locale'] as string) ?? 'it')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveTenantSettingsBatchAction({
        'notification.sender_email': senderEmail,
        'notification.sender_name': senderName,
        'notification.signature': signature,
        'notification.default_locale': defaultLocale,
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Impostazioni comunicazioni salvate.' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Email verso gli ospiti</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="sender-email"
            label="Email mittente"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="noreply@hotelbellavista.it"
          />
          <Input
            id="sender-name"
            label="Nome mittente"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Hotel Bellavista"
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Firma email</h3>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Il team di Hotel Bellavista"
        />
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Lingua</h3>
        <div className="max-w-sm">
          <Select
            id="default-locale"
            label="Lingua predefinita per comunicazioni ospiti"
            value={defaultLocale}
            onChange={(e) => setDefaultLocale(e.target.value)}
            options={LOCALE_OPTIONS}
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
          {isPending ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </form>
  )
}
