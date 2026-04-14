'use client'

import { create } from 'zustand'
import type {
  Property,
  StaffMember,
  TenantAccount,
  TenantMembership,
} from '../types/database'

export interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  tenant: TenantAccount | null
  tenants: TenantAccount[]
  tenantMemberships: TenantMembership[]
  staff: StaffMember | null
  staffMemberships: StaffMember[]
  property: Property | null
  properties: Property[]
  isLoading: boolean
  setUser: (user: AuthState['user']) => void
  setTenant: (tenant: TenantAccount | null) => void
  setTenants: (tenants: TenantAccount[]) => void
  setTenantMemberships: (memberships: TenantMembership[]) => void
  setStaff: (staff: StaffMember | null) => void
  setStaffMemberships: (memberships: StaffMember[]) => void
  setProperty: (property: Property | null) => void
  setProperties: (properties: Property[]) => void
  setLoading: (loading: boolean) => void
  hydrate: (payload: {
    user: AuthUser | null
    tenant: TenantAccount | null
    tenants: TenantAccount[]
    tenantMemberships: TenantMembership[]
    staff: StaffMember | null
    staffMemberships: StaffMember[]
    property: Property | null
    properties: Property[]
  }) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  tenants: [],
  tenantMemberships: [],
  staff: null,
  staffMemberships: [],
  property: null,
  properties: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setTenants: (tenants) => set({ tenants }),
  setTenantMemberships: (tenantMemberships) => set({ tenantMemberships }),
  setStaff: (staff) => set({ staff }),
  setStaffMemberships: (staffMemberships) => set({ staffMemberships }),
  setProperty: (property) => set({ property }),
  setProperties: (properties) => set({ properties }),
  setLoading: (isLoading) => set({ isLoading }),
  hydrate: ({
    user,
    tenant,
    tenants,
    tenantMemberships,
    staff,
    staffMemberships,
    property,
    properties,
  }) =>
    set({
      user,
      tenant,
      tenants,
      tenantMemberships,
      staff,
      staffMemberships,
      property,
      properties,
      isLoading: false,
    }),
  reset: () =>
    set({
      user: null,
      tenant: null,
      tenants: [],
      tenantMemberships: [],
      staff: null,
      staffMemberships: [],
      property: null,
      properties: [],
      isLoading: false,
    }),
}))
