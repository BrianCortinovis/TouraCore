'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { createClient } from '@touracore/db/client'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (resetError) {
        setError('Errore nell\'invio. Riprova tra qualche minuto.')
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Controlla la tua email</h2>
          <p className="mt-3 text-gray-500">
            Abbiamo inviato un link di recupero a <strong>{email}</strong>.
            Segui le istruzioni nell&apos;email per reimpostare la password.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-6">
              Torna al login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Password dimenticata</h2>
          <p className="mt-2 text-sm text-gray-500">
            Inserisci la tua email e ti invieremo un link per reimpostare la password
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

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Invia link di recupero
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ricordi la password?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Torna al login
          </Link>
        </p>
      </div>
    </div>
  )
}
