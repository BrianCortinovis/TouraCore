export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string = '/'
): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  // Protegge da open-redirect (//evil.com)
  if (next.startsWith('//')) return fallback

  return next
}
