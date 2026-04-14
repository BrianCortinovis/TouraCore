'use client'

import { create } from 'zustand'
import type {
  AuthUser,
  Profile,
  TenantAccount,
  TenantMembership,
  StaffMember,
  Property,
  AuthBootstrapData,
} from './types'

interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  tenant: TenantAccount | null
  tenants: TenantAccount[]
  tenantMemberships: TenantMembership[]
  staff: StaffMember | null
  staffMemberships: StaffMember[]
  property: Property | null
  properties: Property[]
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setProfile: (profile: Profile | null) => void
  setTenant: (tenant: TenantAccount | null) => void
  setProperty: (property: Property | null) => void
  setLoading: (loading: boolean) => void
  hydrate: (payload: AuthBootstrapData) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  tenant: null,
  tenants: [],
  tenantMemberships: [],
  staff: null,
  staffMemberships: [],
  property: null,
  properties: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setTenant: (tenant) => set({ tenant }),
  setProperty: (property) => set({ property }),
  setLoading: (isLoading) => set({ isLoading }),
  hydrate: (payload) =>
    set({
      user: payload.user,
      profile: payload.profile,
      tenant: payload.tenant,
      tenants: payload.tenants,
      tenantMemberships: payload.tenantMemberships,
      staff: payload.staff,
      staffMemberships: payload.staffMemberships,
      property: payload.property,
      properties: payload.properties,
      isLoading: false,
    }),
  reset: () =>
    set({
      user: null,
      profile: null,
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
