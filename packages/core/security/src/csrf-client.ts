'use client'

import { getCsrfCookieName, getCsrfHeaderName } from './csrf'

export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const name = getCsrfCookieName()
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1]
}

export function csrfHeaders(): Record<string, string> {
  const token = getCsrfTokenFromCookie()
  if (!token) return {}
  return { [getCsrfHeaderName()]: token }
}

export { getCsrfCookieName, getCsrfHeaderName } from './csrf'
