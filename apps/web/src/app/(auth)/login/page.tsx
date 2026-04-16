import { Suspense } from 'react'
import { sanitizeNextPath } from '@touracore/auth/redirect'
import LoginForm from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[]; error?: string | string[] }> | { next?: string | string[]; error?: string | string[] }
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams)

  const nextParam = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next
  const nextPath = sanitizeNextPath(nextParam, '/')
  const errorParam = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error

  const errorMessage = getLoginErrorMessage(errorParam)

  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm nextPath={nextPath} errorMessage={errorMessage} />
    </Suspense>
  )
}

function getLoginErrorMessage(error: string | undefined): string | null {
  switch (error) {
    case 'invalid_credentials':
      return 'Email o password non validi'
    case 'email_not_confirmed':
      return 'Email non confermata. Controlla la tua casella di posta.'
    case 'missing_credentials':
      return 'Compila email e password.'
    case 'auth':
    case 'auth_error':
      return 'Accesso non riuscito. Riprova.'
    default:
      return null
  }
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">TouraCore</h1>
          <p className="mt-3 text-lg text-blue-100">
            Piattaforma multi-verticale per il turismo
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TouraCore</h1>
          </div>

          <div className="space-y-3">
            <div className="h-7 w-24 rounded bg-gray-200" />
            <div className="h-4 w-72 max-w-full rounded bg-gray-100" />
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-10 w-full rounded-lg bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-10 w-full rounded-lg bg-gray-100" />
            </div>
            <div className="h-12 w-full rounded-lg bg-blue-600/80" />
          </div>
        </div>
      </div>
    </div>
  )
}
