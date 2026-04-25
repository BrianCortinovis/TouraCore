'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { createClient } from '@touracore/db/client'
import { validatePasswordPolicy, MIN_PASSWORD_LENGTH } from '@touracore/auth/password-policy'

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientInvite = searchParams?.get('client_invite') ?? null
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [intentScope, setIntentScope] = useState<'tenant' | 'agency'>('tenant')
  const [intentModule, setIntentModule] = useState<string>('hospitality')
  const [inviteAgencyName, setInviteAgencyName] = useState<string | null>(null)

  useEffect(() => {
    if (!clientInvite) return
    setIntentScope('tenant')
    const ac = new AbortController()
    fetch(`/api/agency/client-invite/lookup?token=${encodeURIComponent(clientInvite)}`, { signal: ac.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { agencyName?: string; verticalHint?: string; email?: string } | null) => {
        if (!data) return
        if (data.agencyName) setInviteAgencyName(data.agencyName)
        if (data.verticalHint) setIntentModule(data.verticalHint)
        if (data.email) setFormData((f) => ({ ...f, email: data.email ?? f.email }))
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
      })
    return () => ac.abort()
  }, [clientInvite])
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono')
      setIsLoading(false)
      return
    }

    const passwordError = validatePasswordPolicy(formData.password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.displayName,
            intent_scope: intentScope,
            intent_module: intentScope === 'agency' ? null : intentModule,
            pending_client_invite: clientInvite,
          },
        },
      })

      if (authError) {
        setError('Registrazione non riuscita. Verifica i dati inseriti e riprova.')
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Registrazione completata!</h2>
          <p className="mt-3 text-gray-500">
            Controlla la tua email ({formData.email}) per confermare il tuo account.
          </p>
          <Button className="mt-6" onClick={() => router.push('/login')}>
            Vai al login
          </Button>
        </div>
      </div>
    )
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
            Piattaforma multi-verticale per il turismo
          </p>
          <div className="mt-8 space-y-4 text-left">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <p className="font-medium text-white">Prova gratuita 14 giorni</p>
              <p className="mt-1 text-sm text-blue-200">Nessuna carta di credito richiesta</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <p className="font-medium text-white">Setup in 5 minuti</p>
              <p className="mt-1 text-sm text-blue-200">Configura la tua struttura e inizia subito</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form registrazione */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TouraCore</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Crea il tuo account</h2>
            <p className="mt-2 text-sm text-gray-500">
              Scegli cosa vuoi gestire. Potrai aggiungere altro dopo.
            </p>
          </div>

          {inviteAgencyName && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              Invito da <strong>{inviteAgencyName}</strong>. Il tuo account sarà collegato a questa agenzia.
            </div>
          )}

          {!clientInvite && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Tipo account</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIntentScope('tenant')}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  intentScope === 'tenant' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">Struttura / Attività</div>
                <div className="mt-1 text-xs text-gray-500">Hotel, ristorante, noleggi, tour</div>
              </button>
              <button
                type="button"
                onClick={() => setIntentScope('agency')}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  intentScope === 'agency' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">Agenzia</div>
                <div className="mt-1 text-xs text-gray-500">Gestisci più clienti</div>
              </button>
            </div>
          </div>
          )}

          {intentScope === 'tenant' && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Cosa gestisci?</label>
              <select
                value={intentModule}
                onChange={(e) => setIntentModule(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="hospitality">Struttura ricettiva (hotel/B&amp;B/agriturismo)</option>
                <option value="restaurant">Ristorazione</option>
                <option value="bike_rental">Noleggio bike/e-bike</option>
                <option value="moto_rental">Noleggio moto</option>
                <option value="experiences">Esperienze / Tour</option>
                <option value="wellness">Wellness / SPA</option>
                <option value="ski_school">Scuola sci</option>
              </select>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome e cognome"
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Mario Rossi"
              required
              value={formData.displayName}
              onChange={handleChange}
              autoComplete="name"
            />

            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              placeholder="nome@azienda.it"
              required
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={`Minimo ${MIN_PASSWORD_LENGTH} caratteri`}
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-xs text-gray-500">Mostra password</span>
              </label>
            </div>

            <Input
              label="Conferma password"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Ripeti la password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Crea account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Hai già un account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Caricamento…</div>}>
      <RegisterPageInner />
    </Suspense>
  )
}
