'use client'

import { useState } from 'react'
import Link from 'next/link'

interface LoginFormProps {
  nextPath: string
  errorMessage?: string | null
}

export default function LoginForm({ nextPath, errorMessage }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

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

          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </div>
          )}

          <form action="/api/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nome@azienda.it"
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="La tua password"
                required
                autoComplete="current-password"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Accedi
            </button>
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
