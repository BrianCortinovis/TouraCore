import { cache } from 'react'
import { getAuthBootstrapData as getCoreBootstrapData } from '@touracore/auth/bootstrap'
import type { Property, StaffMember, TenantAccount, TenantMembership } from '../types/database'
import type { AuthUser } from '../stores/auth-store'

export interface AuthBootstrapData {
  user: AuthUser | null
  tenant: TenantAccount | null
  tenants: TenantAccount[]
  tenantMemberships: TenantMembership[]
  property: Property | null
  staff: StaffMember | null
  staffMemberships: StaffMember[]
  properties: Property[]
}

export const getAuthBootstrapData = cache(async (): Promise<AuthBootstrapData> => {
  const core = await getCoreBootstrapData()
  return core as unknown as AuthBootstrapData
})

export const getCurrentOrg = cache(async (): Promise<{
  tenant: TenantAccount | null
  property: Property | null
  staff: StaffMember | null
}> => {
  const { tenant, property, staff } = await getAuthBootstrapData()
  return { tenant, property, staff }
})
