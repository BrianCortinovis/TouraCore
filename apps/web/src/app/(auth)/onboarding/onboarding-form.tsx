'use client'

import { useState, useCallback } from 'react'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { createTenantAction, checkSlugAvailability, type OnboardingInput } from './actions'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OnboardingInput, string>>>({})
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    if (!slugManuallyEdited) {
      const autoSlug = slugify(value)
      setSlug(autoSlug)
      setSlugAvailable(null)
    }
  }, [slugManuallyEdited])

  const handleSlugChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(cleaned)
    setSlugManuallyEdited(true)
    setSlugAvailable(null)
  }, [])

  const handleSlugBlur = useCallback(async () => {
    if (slug.length >= 3) {
      const available = await checkSlugAvailability(slug)
      setSlugAvailable(available)
    }
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const result = await createTenantAction({ name, slug })

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      if (result.error) setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Pannello branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">TouraCore</h1>
          <p className="mt-3 text-lg text-blue-100">
            Configura la tua attività
          </p>
          <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Dai un nome alla tua attività
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Aggiungi strutture e collaboratori
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Gestisci prenotazioni e tariffe
            </div>
          </div>
        </div>
      </div>

      {/* Form onboarding */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TouraCore</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Benvenuto! Configuriamo la tua attività</h2>
            <p className="mt-2 text-sm text-gray-500">
              Ci vogliono 2 minuti. Potrai modificare tutto in seguito.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Come si chiama la tua struttura?"
                id="name"
                type="text"
                placeholder="Es. Casa Vacanze Belvedere, Hotel Bellavista..."
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                error={fieldErrors.name}
              />
              <p className="mt-1 text-xs text-gray-500">Questo è il nome che i tuoi ospiti vedranno</p>
            </div>

            <div>
              <Input
                label="Indirizzo della tua pagina pubblica"
                id="slug"
                type="text"
                placeholder="casa-belvedere"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                error={fieldErrors.slug}
              />
              <p className="mt-1 text-xs text-gray-500">I clienti ti troveranno su touracore.com/{slug || 'il-tuo-indirizzo'}</p>
              <div className="mt-1 flex items-center gap-2">
                {slug.length >= 3 && slugAvailable === true && (
                  <span className="text-xs text-green-600">Libero</span>
                )}
                {slug.length >= 3 && slugAvailable === false && (
                  <span className="text-xs text-red-600">Già utilizzato</span>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={slug.length < 3 || slugAvailable === false}
            >
              Crea la mia attività
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
