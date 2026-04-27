'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[auth]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Errore di autenticazione</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Qualcosa è andato storto. Riprova o richiedi un nuovo link.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Riprova
        </button>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Vai al login
        </Link>
      </div>
    </div>
  )
}
