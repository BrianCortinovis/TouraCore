// ATTENZIONE: non usare queste funzioni con Next.js Server Actions.
// Le Server Actions sono già protette da Next.js via check Origin/Host nativo.
// Questo modulo resta disponibile solo per eventuali route /api/* tradizionali.
import { cookies, headers } from 'next/headers'
import { getCsrfCookieName, getCsrfHeaderName, validateCsrfFromRequest } from './csrf'

export async function assertCsrf(): Promise<void> {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const cookieToken = cookieStore.get(getCsrfCookieName())?.value
  const headerToken = headerStore.get(getCsrfHeaderName()) ?? undefined

  if (!validateCsrfFromRequest(cookieToken, headerToken)) {
    throw new Error('CSRF token non valido')
  }
}

export async function verifyCsrf(): Promise<boolean> {
  try {
    await assertCsrf()
    return true
  } catch {
    return false
  }
}
