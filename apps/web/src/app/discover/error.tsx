'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[discover]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Errore caricamento strutture</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Non siamo riusciti a caricare le strutture pubblicate. Riprova fra qualche istante.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Riprova
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Home
        </Link>
      </div>
    </div>
  )
}
