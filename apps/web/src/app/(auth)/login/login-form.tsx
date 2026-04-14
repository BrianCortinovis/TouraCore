'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { createClient } from '@touracore/db/client'
import { sanitizeNextPath } from '@touracore/auth/redirect'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setError('Email o password non validi')
        } else if (authError.message === 'Email not confirmed') {
          setError('Email non confermata. Controlla la tua casella di posta.')
        } else {
          setError(authError.message)
        }
        setIsLoading(false)
        return
      }

      const next = sanitizeNextPath(searchParams.get('next'))
      router.push(next)
      router.refresh()
    } catch {
      setError('Errore di connessione. Riprova.')
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
            Piattaforma multi-verticale per il turismo
          </p>
          <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Hospitality, tour, bike rental, esperienze
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Booking engine e channel manager
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Gestione multi-struttura con agenzie e portali
            </div>
          </div>
        </div>
      </div>

      {/* Form login */}
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
            <h2 className="text-2xl font-bold text-gray-900">Accedi</h2>
            <p className="mt-2 text-sm text-gray-500">
              Inserisci le tue credenziali per accedere alla piattaforma
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
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="nome@azienda.it"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="La tua password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="mt-1 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-gray-500">Mostra password</span>
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Password dimenticata?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Accedi
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Non hai un account?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
              Crea il tuo account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
