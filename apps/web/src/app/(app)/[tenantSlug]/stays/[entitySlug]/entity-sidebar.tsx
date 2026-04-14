'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Mail,
  Settings,
  BedDouble,
  Grid3x3,
  Banknote,
  Calendar,
  BookOpen,
  Image,
  Link2,
  ArrowLeft,
  ChevronDown,
  Check,
  Plus,
  LogIn,
  LogOut,
  Shield,
  Coins,
  Ban,
  FileText,
  TrendingUp,
  UtensilsCrossed,
  Sparkles,
  Smartphone,
  FileSignature,
  Zap,
  BarChart3,
  Gift,
  type LucideIcon,
} from 'lucide-react'
import {
  getNavigation,
  type PropertyType,
  type SidebarSection,
} from '@touracore/hospitality-config'

const SECTION_META: Record<SidebarSection, { label: string; icon: LucideIcon; agencyHidden?: boolean; placeholder?: boolean }> = {
  'overview': { label: 'Panoramica', icon: LayoutDashboard },
  'planning': { label: 'Planning', icon: CalendarDays },
  'bookings': { label: 'Prenotazioni', icon: BookOpen },
  'check-in': { label: 'Check-in', icon: LogIn },
  'check-out': { label: 'Check-out', icon: LogOut },
  'guests': { label: 'Ospiti', icon: Users },
  'rooms': { label: 'Camere', icon: BedDouble },
  'room-types': { label: 'Tipologie', icon: Grid3x3 },
  'room-blocks': { label: 'Blocchi', icon: Ban },
  'rate-plans': { label: 'Tariffe', icon: Banknote, agencyHidden: true },
  'seasons': { label: 'Periodi', icon: Calendar, agencyHidden: true },
  'communications': { label: 'Comunicazioni', icon: Mail },
  'media': { label: 'Media', icon: Image },
  'financials': { label: 'Finanze', icon: TrendingUp },
  'invoices': { label: 'Fatture', icon: FileText, agencyHidden: true },
  'compliance-alloggiati': { label: 'Alloggiati', icon: Shield },
  'compliance-tourist-tax': { label: 'Tassa sogg.', icon: Coins },
  'compliance-istat': { label: 'ISTAT', icon: BarChart3 },
  'ical': { label: 'iCal Sync', icon: Link2, agencyHidden: true },
  'settings': { label: 'Impostazioni', icon: Settings, agencyHidden: true },
  'services': { label: 'Servizi extra', icon: Gift },
  'restaurant': { label: 'Ristorante', icon: UtensilsCrossed, placeholder: true },
  'housekeeping': { label: 'Housekeeping', icon: Sparkles },
  'self-checkin': { label: 'Self check-in', icon: Smartphone },
  'contracts': { label: 'Contratti', icon: FileSignature, placeholder: true },
  'utilities': { label: 'Utenze', icon: Zap, placeholder: true },
}

function sectionToHref(base: string, section: SidebarSection): string {
  switch (section) {
    case 'overview': return base
    case 'compliance-alloggiati': return `${base}/compliance/alloggiati`
    case 'compliance-tourist-tax': return `${base}/compliance/tourist-tax`
    case 'compliance-istat': return `${base}/compliance/istat`
    default: return `${base}/${section}`
  }
}

interface EntitySummary {
  id: string
  slug: string
  name: string
  management_mode: 'agency_managed' | 'self_service'
}

interface EntitySidebarProps {
  tenantSlug: string
  entitySlug: string
  entityName: string
  managementMode: 'agency_managed' | 'self_service'
  propertyType: string | null
  isImprenditoriale?: boolean
  country?: string
  allEntities: EntitySummary[]
}

export function EntitySidebar({
  tenantSlug,
  entitySlug,
  entityName,
  managementMode,
  propertyType,
  isImprenditoriale = false,
  country = 'IT',
  allEntities,
}: EntitySidebarProps) {
  const pathname = usePathname()
  const basePath = `/${tenantSlug}/stays/${entitySlug}`
  const isAgencyManaged = managementMode === 'agency_managed'

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!switcherOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [switcherOpen])

  const groups = getNavigation(
    (propertyType ?? 'hotel') as PropertyType,
    isImprenditoriale,
    country,
  )

  return (
    <aside className="w-24 shrink-0">
      <div className="sticky top-20 space-y-2" style={{ paddingLeft: 2, paddingRight: 2 }}>
        <Link
          href={`/${tenantSlug}`}
          className="flex flex-col items-center gap-1.5 rounded-md border border-gray-200 bg-white py-3 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-900"
          title="Torna all'account"
        >
          <ArrowLeft className="h-7 w-7" />
          <span className="text-[11px] font-medium leading-none">Account</span>
        </Link>

        <div className="border-t border-gray-200 pt-2">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            CMS
          </p>

          {/* Switcher strutture */}
          <div ref={switcherRef} className="relative mt-1 mb-2">
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-1 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              title={entityName}
            >
              <span className="truncate">{entityName}</span>
              <ChevronDown
                className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${
                  switcherOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {switcherOpen && (
              <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Strutture
                  </p>
                </div>
                <div className="max-h-72 overflow-auto py-1">
                  {allEntities.map((e) => {
                    const isCurrent = e.slug === entitySlug
                    return (
                      <Link
                        key={e.id}
                        href={`/${tenantSlug}/stays/${e.slug}`}
                        onClick={() => setSwitcherOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        {e.management_mode === 'agency_managed' && (
                          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
                            Agenzia
                          </span>
                        )}
                        {isCurrent && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                      </Link>
                    )
                  })}
                </div>
                <div className="border-t border-gray-100 py-1">
                  <Link
                    href={`/${tenantSlug}/stays`}
                    onClick={() => setSwitcherOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    <span>Vedi tutte le strutture</span>
                  </Link>
                  <Link
                    href={`/${tenantSlug}/stays/new`}
                    onClick={() => setSwitcherOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuova struttura
                  </Link>
                </div>
              </div>
            )}
          </div>

          {isAgencyManaged && (
            <div className="mb-2 text-center">
              <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                Agenzia
              </span>
            </div>
          )}

          <nav className="space-y-3">
            {groups.map((group) => {
              const items = group.sections
                .filter((section) => {
                  const meta = SECTION_META[section]
                  if (!meta) return false
                  if (isAgencyManaged && meta.agencyHidden) return false
                  return true
                })

              if (items.length === 0) return null

              return (
                <div key={group.key}>
                  <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-gray-300">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((section) => {
                      const meta = SECTION_META[section]
                      const href = sectionToHref(basePath, section)
                      const isActive =
                        pathname === href ||
                        (href !== basePath && pathname.startsWith(href))
                      const Icon = meta.icon

                      return (
                        <Link
                          key={section}
                          href={href}
                          className={`group relative flex flex-col items-center gap-1 rounded-md py-2 transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          title={meta.label}
                        >
                          <Icon className="h-7 w-7" />
                          <span className="text-[11px] font-medium leading-none text-center">
                            {meta.label}
                          </span>
                          {meta.placeholder && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
