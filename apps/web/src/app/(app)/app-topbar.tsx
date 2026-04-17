'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import {
  Building2,
  ChevronDown,
  Check,
  ArrowLeft,
  User,
  Shield,
} from 'lucide-react'

export function AppTopBar() {
  const { user, tenant, tenants, properties } = useAuthStore()
  const pathname = usePathname()
  const [tenantOpen, setTenantOpen] = useState(false)
  const [entityOpen, setEntityOpen] = useState(false)
  const tenantRef = useRef<HTMLDivElement>(null)
  const entityRef = useRef<HTMLDivElement>(null)

  const tenantSlug = pathname.split('/')[1] ?? ''
  const currentTenant = tenants.find((t) => t.slug === tenantSlug) ?? tenant

  const pathParts = pathname.split('/')
  const entitySlug = pathParts[2] === 'stays' && pathParts[3] ? pathParts[3] : null
  const currentEntity = entitySlug
    ? properties.find((p) => p.slug === entitySlug)
    : null

  const isAgencyRoute = pathname.startsWith('/agency')
  const isAgencyManaged = currentEntity?.management_mode === 'agency_managed'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setTenantOpen(false)
      }
      if (entityRef.current && !entityRef.current.contains(e.target as Node)) {
        setEntityOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex h-14 w-full items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-blue-600">
              TouraCore
            </Link>

            {/* Tenant switcher */}
            {currentTenant && (
              <div ref={tenantRef} className="relative">
                <button
                  onClick={() => { setTenantOpen(!tenantOpen); setEntityOpen(false) }}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="max-w-[150px] truncate font-medium text-gray-700">
                    {currentTenant.name}
                  </span>
                  {tenants.length > 1 && (
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${tenantOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {tenantOpen && tenants.length > 1 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {tenants.map((t) => (
                      <Link
                        key={t.id}
                        href={`/${t.slug}`}
                        onClick={() => setTenantOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="flex-1 truncate text-gray-700">{t.name}</span>
                        {t.id === currentTenant.id && <Check className="h-4 w-4 text-blue-600" />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Entity switcher */}
            {currentEntity && properties.length > 0 && (
              <div ref={entityRef} className="relative">
                <button
                  onClick={() => { setEntityOpen(!entityOpen); setTenantOpen(false) }}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  <span className="max-w-[150px] truncate font-medium text-gray-700">
                    {currentEntity.name}
                  </span>
                  {properties.length > 1 && (
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${entityOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {entityOpen && properties.length > 1 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {properties.map((p) => (
                      <Link
                        key={p.id}
                        href={`/${tenantSlug}/stays/${p.slug}`}
                        onClick={() => setEntityOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="flex-1 truncate text-gray-700">{p.name}</span>
                        {p.id === currentEntity.id && <Check className="h-4 w-4 text-blue-600" />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isAgencyRoute && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm border border-amber-200">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-700">Modalità agenzia</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Link
              href="/account/profile"
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              title="Profilo utente platform"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Agency managed banner */}
      {isAgencyManaged && !isAgencyRoute && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-700">
          <Shield className="mr-1 inline h-4 w-4" />
          Questa struttura è gestita da un&apos;agenzia. Alcune funzionalità potrebbero essere limitate.
        </div>
      )}
    </>
  )
}
