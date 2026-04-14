'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@touracore/db/client'
import { useAuthStore, type AuthUser } from '../../stores/auth-store'
import type {
  Property,
  StaffMember,
  TenantAccount,
  TenantMembership,
} from '../../types/database'

interface AuthProviderProps {
  children: React.ReactNode
  initialData?: {
    user: AuthUser | null
    tenant: TenantAccount | null
    tenants: TenantAccount[]
    tenantMemberships: TenantMembership[]
    staff: StaffMember | null
    staffMemberships: StaffMember[]
    property: Property | null
    properties: Property[]
  }
}

export function AuthProvider({ children, initialData }: AuthProviderProps) {
  const initialized = useRef(false)
  const {
    setUser,
    setTenant,
    setTenants,
    setTenantMemberships,
    setStaff,
    setStaffMemberships,
    setProperty,
    setProperties,
    setLoading,
    hydrate,
    reset,
  } = useAuthStore()

  const loadAuthData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        reset()
        return
      }

      setUser({ id: user.id, email: user.email ?? '' })

      const { data: staffMembers, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (staffError || !staffMembers) {
        setTenant(null)
        setTenants([])
        setTenantMemberships([])
        setStaff(null)
        setStaffMemberships([])
        setProperty(null)
        setProperties([])
        setLoading(false)
        return
      }

      setStaffMemberships(staffMembers as StaffMember[])

      const entityIds = staffMembers.map((s) => s.entity_id)
      let props: Property[] = []

      if (entityIds.length > 0) {
        const { data: properties, error: propsError } = await supabase
          .from('entities')
          .select('*, tenant:tenants(*)')
          .in('id', entityIds)

        if (propsError || !properties) {
          setLoading(false)
          return
        }

        props = properties as Property[]
      }

      const { data: membershipRows, error: membershipError } = await supabase
        .from('memberships')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (membershipError || !membershipRows) {
        setLoading(false)
        return
      }

      const memberships = membershipRows as (TenantMembership & {
        tenant: TenantAccount | null
      })[]

      const tenants = [
        ...props
          .map((p) => (p as Property & { tenant: TenantAccount | null }).tenant)
          .filter((t): t is TenantAccount => Boolean(t)),
        ...memberships
          .map((m) => m.tenant)
          .filter((t): t is TenantAccount => Boolean(t)),
      ].filter((t, i, list) => list.findIndex((c) => c.id === t.id) === i)

      setProperties(props)
      setTenants(tenants)
      setTenantMemberships(
        memberships.map(({ tenant: _t, ...rest }) => rest)
      )

      const selectedEntityId = document.cookie
        .split('; ')
        .find((c) => c.startsWith('touracore_selected_entity='))
        ?.split('=')[1]

      const primaryProperty =
        (selectedEntityId &&
          props.find((p) => p.id === selectedEntityId)) ||
        props[0] ||
        null
      const primaryStaff =
        (primaryProperty &&
          staffMembers.find(
            (s) => s.entity_id === primaryProperty.id
          )) ||
        staffMembers[0] ||
        null

      setTenant(
        (primaryProperty as Property & { tenant?: TenantAccount | null })
          ?.tenant ??
          tenants[0] ??
          null
      )
      setStaff(primaryStaff as StaffMember | null)
      setProperty(primaryProperty as Property | null)
    } catch {
      reset()
    } finally {
      setLoading(false)
    }
  }, [
    setUser,
    setTenant,
    setTenants,
    setTenantMemberships,
    setStaff,
    setStaffMemberships,
    setProperty,
    setProperties,
    setLoading,
    reset,
  ])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = createClient()

    if (initialData) {
      hydrate(initialData)
    } else {
      loadAuthData()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        reset()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAuthData()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [hydrate, initialData, loadAuthData, reset])

  return <>{children}</>
}
