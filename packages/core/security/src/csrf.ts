const CSRF_COOKIE_NAME = '__touracore_csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

function generateRandomHex(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export function generateCsrfToken(): string {
  return generateRandomHex(TOKEN_LENGTH)
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME
}

export function validateCsrfFromRequest(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false

  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= (cookieToken.charCodeAt(i) ?? 0) ^ (headerToken.charCodeAt(i) ?? 0)
  }
  return mismatch === 0
}
