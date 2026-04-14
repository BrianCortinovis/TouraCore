import { getCurrentUser } from '@touracore/auth'
import { getCurrentOrg } from '../queries/auth'
import type { Property, StaffMember, StaffRole } from '../types/database'

export async function requireCurrentEntity(): Promise<{
  property: Property
  staff: StaffMember | null
}> {
  const { property, staff } = await getCurrentOrg()

  if (!property) {
    throw new Error('Struttura non trovata')
  }

  return { property, staff }
}

export async function assertCurrentEntityAccess(expectedEntityId: string): Promise<{
  property: Property
  staff: StaffMember | null
}> {
  if (!expectedEntityId) {
    throw new Error('Property id is required')
  }

  const { property, staff } = await requireCurrentEntity()

  if (property.id !== expectedEntityId) {
    throw new Error('Operazione consentita solo sulla struttura selezionata')
  }

  return { property, staff }
}

export async function requireOrgRoles(
  allowedRoles: StaffRole[]
): Promise<{ property: Property; staff: StaffMember }> {
  const { property, staff } = await requireCurrentEntity()

  if (!staff) {
    throw new Error('Unauthorized')
  }

  if (!allowedRoles.includes(staff.role)) {
    throw new Error('Insufficient permissions')
  }

  return { property, staff }
}

export function getSuperAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser()

  const email = user?.email?.toLowerCase() || ''
  const allowedEmails = getSuperAdminEmails()

  if (!user || !email || !allowedEmails.includes(email)) {
    throw new Error('Superadmin access required')
  }

  return user
}
