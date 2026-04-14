'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@touracore/ui'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard]', error)
  }, [error])

  const isNoTenant = error.message.includes('TENANT_REQUIRED')

  if (isNoTenant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Non hai ancora configurato la tua attività
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Per iniziare, completa la configurazione della tua attività. Ci vogliono 2 minuti.
        </p>
        <Link href="/onboarding" className="mt-6">
          <Button>Configura la mia attività</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">
        Si è verificato un errore
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Qualcosa è andato storto nel caricamento della pagina. Riprova o contatta il supporto se il problema persiste.
      </p>
      <Button onClick={reset} className="mt-6">
        Riprova
      </Button>
    </div>
  )
}
