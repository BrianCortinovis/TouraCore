import { headers } from 'next/headers'
import type { AuditContext } from './types'

export async function getAuditContext(
  tenantId: string,
  userId: string,
): Promise<AuditContext> {
  const headerStore = await headers()

  const forwarded = headerStore.get('x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim() ?? headerStore.get('x-real-ip') ?? undefined
  const userAgent = headerStore.get('user-agent') ?? undefined

  return {
    tenantId,
    userId,
    ipAddress,
    userAgent,
  }
}
