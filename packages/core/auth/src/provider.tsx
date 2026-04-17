'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@touracore/db/client'
import { useAuthStore } from './store'
import type {
  AuthBootstrapData,
  AuthUser,
  Entity,
  StaffMember,
  TenantAccount,
  TenantMembership,
} from './types'

interface AuthProviderProps {
  children: React.ReactNode
  initialData?: AuthBootstrapData
}

export function AuthProvider({ children, initialData }: AuthProviderProps) {
  const initialized = useRef(false)
  const { hydrate, reset, setUser, setLoading } = useAuthStore()

  const loadAuthData = useCallback(async () => {
    try {
      setLoading(true)
      let supabase
      try {
        supabase = createClient()
      } catch {
        reset()
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        reset()
        return
      }

      setUser({ id: user.id, email: user.email ?? '' })

      const [{ data: profileRow }, { data: staffMembers }, { data: membershipRows }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('staff_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('memberships')
            .select('*, tenant:tenants(*)')
            .eq('user_id', user.id)
            .eq('is_active', true),
        ])

      const profile = profileRow ?? null
      const staff = (staffMembers ?? []) as StaffMember[]
      const memberships = (membershipRows ?? []) as (TenantMembership & {
        tenant: TenantAccount | null
      })[]

      let properties: Entity[] = []
      const entityIds = staff.map((s) => s.entity_id)

      if (entityIds.length > 0) {
        const { data: props } = await supabase
          .from('entities')
          .select('*, tenant:tenants(*), accommodation:accommodations(property_type, city, province, country)')
          .in('id', entityIds)

        properties = (props ?? []).map((p) => {
          const acc = Array.isArray((p as { accommodation?: unknown }).accommodation)
            ? ((p as { accommodation: Array<{ property_type?: string }> }).accommodation[0] ?? null)
            : (p as { accommodation?: { property_type?: string } | null }).accommodation
          return { ...p, property_type: acc?.property_type ?? null } as Entity
        })
      } else if (memberships.length > 0) {
        // Fallback: tenant owner without staff_members entries
        const tenantIds = memberships.map((m) => m.tenant_id).filter(Boolean)
        if (tenantIds.length > 0) {
          const { data: fallback } = await supabase
            .from('entities')
            .select('*, tenant:tenants(*), accommodation:accommodations(property_type, city, province, country)')
            .in('tenant_id', tenantIds)
            .eq('is_active', true)
          properties = (fallback ?? []).map((p) => {
            const acc = Array.isArray((p as { accommodation?: unknown }).accommodation)
              ? ((p as { accommodation: Array<{ property_type?: string }> }).accommodation[0] ?? null)
              : (p as { accommodation?: { property_type?: string } | null }).accommodation
            return { ...p, property_type: acc?.property_type ?? null } as Entity
          })
        }
      }

      const tenants = [
        ...properties
          .map((p) => (p as Entity & { tenant: TenantAccount | null }).tenant)
          .filter((t): t is TenantAccount => Boolean(t)),
        ...memberships
          .map((m) => m.tenant)
          .filter((t): t is TenantAccount => Boolean(t)),
      ].filter((t, i, list) => list.findIndex((c) => c.id === t.id) === i)

      const selectedEntityId = document.cookie
        .split('; ')
        .find((c) => c.startsWith('touracore_selected_entity='))
        ?.split('=')[1]

      const primaryProperty =
        (selectedEntityId && properties.find((p) => p.id === selectedEntityId)) ||
        properties[0] ||
        null
      const primaryStaff =
        (primaryProperty && staff.find((s) => s.entity_id === primaryProperty.id)) ||
        staff[0] ||
        null

      hydrate({
        user: { id: user.id, email: user.email ?? '' },
        profile,
        tenant:
          (primaryProperty as Entity & { tenant?: TenantAccount | null })?.tenant ??
          tenants[0] ??
          null,
        tenants,
        tenantMemberships: memberships.map(({ tenant: _t, ...rest }) => rest),
        staff: primaryStaff,
        staffMemberships: staff,
        property: primaryProperty,
        properties,
      })
    } catch {
      reset()
    } finally {
      setLoading(false)
    }
  }, [hydrate, reset, setUser, setLoading])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (initialData) {
      hydrate(initialData)
    } else {
      loadAuthData()
    }

    let supabase
    try {
      supabase = createClient()
    } catch {
      return
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
