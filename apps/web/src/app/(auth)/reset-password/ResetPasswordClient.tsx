'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { createClient } from '@touracore/db/client'
import { validatePasswordPolicy } from '@touracore/auth/password-policy'
import { BrandPanel, MobileBrandHeader } from '../_brand-panel'
import { PasswordStrengthIndicator } from '../_password-strength'

type GateState = 'checking' | 'recovery' | 'no_recovery' | 'expired'

interface Props {
  initialGate: 'recovery' | 'no_recovery'
}

export function ResetPasswordClient({ initialGate }: Props) {
  const router = useRouter()
  const [gate, setGate] = useState<GateState>(initialGate === 'recovery' ? 'checking' : 'no_recovery')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Sicurezza nativa Supabase:
  // 1. Email link contiene token single-use (consumed lato server Supabase al click)
  // 2. Supabase emette session scope-recovery solo dopo verifica token
  // 3. updateUser({ password }) accetta solo session attiva
  // 4. Post-success signOut({ scope: 'global' }) revoca tutti i refresh token
  // Verifica via PASSWORD_RECOVERY event SDK (più affidabile di cookie custom).
  useEffect(() => {
    const supabase = createClient()
    let resolved = false

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        resolved = true
        setGate('recovery')
      }
    })

    // Fallback: se il browser arriva con session già attiva dal redirect Supabase
    void supabase.auth.getSession().then(({ data }) => {
      if (resolved) return
      if (data.session) {
        setGate('recovery')
      } else {
        // Aspetta 1.5s per evento PASSWORD_RECOVERY async, poi marca no_recovery
        setTimeout(() => {
          if (!resolved) setGate('no_recovery')
        }, 1500)
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      setIsLoading(false)
      return
    }

    const passwordError = validatePasswordPolicy(password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        const msg = updateError.message?.toLowerCase() ?? ''
        if (msg.includes('expired') || msg.includes('token')) {
          setError('Il link di recupero è scaduto o non più valido. Richiedi un nuovo link.')
          setGate('expired')
        } else if (msg.includes('session') || msg.includes('auth')) {
          setError('Sessione di recupero non valida. Richiedi un nuovo link dalla pagina "Password dimenticata".')
          setGate('no_recovery')
        } else if (msg.includes('same')) {
          setError('La nuova password non può essere uguale alla precedente.')
        } else {
          setError(`Aggiornamento password non riuscito: ${updateError.message ?? 'errore sconosciuto'}.`)
        }
        setIsLoading(false)
        return
      }

      // Sicurezza: signOut globale revoca TUTTI i refresh token su tutti i device.
      // L'utente deve ri-loggarsi con nuova password.
      await supabase.auth.signOut({ scope: 'global' })
      setSuccess(true)
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen">
      <BrandPanel />
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <MobileBrandHeader />
          {children}
        </div>
      </div>
    </div>
  )

  if (gate === 'checking') {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Verifica del link in corso...</p>
        </div>
      </Shell>
    )
  }

  if (gate === 'no_recovery' || gate === 'expired') {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg className="h-8 w-8 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {gate === 'expired' ? 'Link scaduto' : 'Link non valido'}
          </h2>
          <p className="mt-3 text-gray-500">
            {gate === 'expired'
              ? 'Il link di recupero è scaduto. Per sicurezza i link valgono solo 1 ora.'
              : 'Per reimpostare la password devi prima richiedere un link di recupero via email.'}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/forgot-password">
              <Button className="w-full" size="lg">
                Richiedi un nuovo link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Torna al login
              </Button>
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  if (success) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Password aggiornata</h2>
          <p className="mt-3 text-gray-500">
            La tua password è stata reimpostata con successo. Accedi con le nuove credenziali.
          </p>
          <Button className="mt-6" size="lg" onClick={() => router.push('/login')}>
            Vai al login
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Reimposta password</h2>
        <p className="mt-2 text-sm text-gray-500">
          Inserisci la tua nuova password
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p>{error}</p>
            {(error.includes('scaduto') || error.includes('valida')) && (
              <Link href="/forgot-password" className="mt-1 inline-block font-medium text-red-700 underline hover:text-red-800">
                Richiedi un nuovo link
              </Link>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            label="Nuova password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimo 8 caratteri"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <Input
          label="Conferma nuova password"
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Ripeti la password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs text-gray-500">Mostra password</span>
        </label>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Reimposta password
        </Button>
      </form>
    </Shell>
  )
}
