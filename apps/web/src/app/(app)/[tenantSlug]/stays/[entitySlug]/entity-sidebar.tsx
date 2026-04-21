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
  Smartphone,
  BarChart3,
  Gift,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Inbox,
  Star,
  Wrench,
  Tag,
  ShoppingCart,
  KeyRound,
  MapPin,
  Store,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import {
  getNavigation,
  getPropertyTypeConfig,
  type PropertyType,
  type SidebarSection,
} from '@touracore/hospitality-config'

const STATIC_SECTION_META: Record<SidebarSection, { label: string; icon: LucideIcon; agencyHidden?: boolean; placeholder?: boolean }> = {
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
  'booking-engine': { label: 'Booking engine', icon: Sparkles },
  'media': { label: 'Media', icon: Image },
  'financials': { label: 'Finanze', icon: TrendingUp },
  'invoices': { label: 'Fatture', icon: FileText, agencyHidden: true },
  'reports': { label: 'Report', icon: BarChart3, agencyHidden: true },
  'compliance-alloggiati': { label: 'Alloggiati', icon: Shield },
  'compliance-tourist-tax': { label: 'Tassa sogg.', icon: Coins },
  'compliance-istat': { label: 'ISTAT', icon: BarChart3 },
  'channels': { label: 'Canali', icon: Link2, agencyHidden: true },
  'settings': { label: 'Impostazioni', icon: Settings, agencyHidden: true },
  'services': { label: 'Servizi extra', icon: Gift },
  'restaurant': { label: 'Ristorante', icon: UtensilsCrossed, placeholder: true },
  'housekeeping': { label: 'Housekeeping', icon: Sparkles },
  'self-checkin': { label: 'Self check-in', icon: Smartphone },
  'messaggi': { label: 'Messaggi', icon: Inbox },
  'reviews': { label: 'Recensioni', icon: Star },
  'reportistica': { label: 'Reportistica', icon: BarChart3 },
  'operations': { label: 'Operations', icon: Wrench, agencyHidden: true },
  'promotions': { label: 'Promozioni', icon: Tag, agencyHidden: true },
  'locks': { label: 'Smart lock', icon: KeyRound, agencyHidden: true },
  'guidebooks': { label: 'Guide locali', icon: MapPin },
  'housekeeping-templates': { label: 'Checklist pulizie', icon: Sparkles },
  'supplies': { label: 'Inventory pulizie', icon: ShoppingCart },
  'competitive': { label: 'Pricing concorrenti', icon: TrendingUp, agencyHidden: true },
  'accounting': { label: 'Contabilità', icon: FileText, agencyHidden: true },
  'fx-rates': { label: 'Cambio valute', icon: Banknote, agencyHidden: true },
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function sectionToHref(base: string, section: SidebarSection, _tenantSlug: string): string {
  switch (section) {
    case 'overview': return base
    case 'compliance-alloggiati': return `${base}/compliance/alloggiati`
    case 'compliance-tourist-tax': return `${base}/compliance/tourist-tax`
    case 'compliance-istat': return `${base}/compliance/istat`
    case 'booking-engine': return `${base}/booking-engine`
    case 'housekeeping-templates': return `${base}/housekeeping-templates`
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
  const typeConfig = getPropertyTypeConfig((propertyType ?? 'hotel') as PropertyType)
  const unitLabel = capitalize(typeConfig.unitLabelPlural)
  const sectionMeta: Record<SidebarSection, { label: string; icon: LucideIcon; agencyHidden?: boolean; placeholder?: boolean }> = {
    ...STATIC_SECTION_META,
    rooms: { label: unitLabel, icon: BedDouble },
    'room-types': { label: `Tipologie ${unitLabel}`, icon: Grid3x3 },
    'room-blocks': { label: `Blocchi ${unitLabel}`, icon: Ban },
  }

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Stato collapsed (desktop): rail stretta (icone only) vs espansa (icone + label)
  // Persist in localStorage. Durante SSR e primo render client usiamo sempre
  // il default (expanded) per evitare hydration mismatch — la preferenza si
  // applica nel useEffect dopo il mount.
  const [collapsedPref, setCollapsedPref] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('touracore_sidebar_collapsed')
    if (stored === '1') setCollapsedPref(true)
    setMounted(true)
  }, [])
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('touracore_sidebar_collapsed', collapsedPref ? '1' : '0')
    }
  }, [collapsedPref, mounted])

  // Valore effettivo usato nel render: server e primo client render → false
  const collapsed = mounted ? collapsedPref : false
  const setCollapsed = setCollapsedPref

  // Drawer mobile (< lg)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    // Chiudi drawer al cambio route
    setMobileOpen(false)
  }, [pathname])

  // Sezioni sidebar espandibili (tutti aperte di default)
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = (key: string) => {
    setClosedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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

  // Disabilita scroll body quando drawer mobile è aperto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const groups = getNavigation(
    (propertyType ?? 'hotel') as PropertyType,
    isImprenditoriale,
    country,
  )

  // Rendering della nav — estratta come funzione perché usata 3 volte
  // (desktop collapsed, desktop expanded, mobile drawer)
  const renderNav = (showLabels: boolean, onItemClick?: () => void) => (
    <nav className="space-y-3">
      {groups.map((group) => {
        const items = group.sections.filter((section) => {
          const meta = sectionMeta[section]
          if (!meta) return false
          if (isAgencyManaged && meta.agencyHidden) return false
          return true
        })

        if (items.length === 0) return null

        const isClosed = closedGroups[group.key] ?? false

        return (
          <div key={group.key}>
            {showLabels ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-800 hover:text-black"
                aria-expanded={!isClosed}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-600 transition-transform ${
                    isClosed ? '-rotate-90' : ''
                  }`}
                />
              </button>
            ) : (
              <p className="mb-1 text-center text-[9px] font-bold uppercase tracking-wider text-gray-600">
                {group.label.slice(0, 4)}
              </p>
            )}
            {!(showLabels && isClosed) && (
            <div className="space-y-0.5">
              {items.map((section) => {
                const meta = sectionMeta[section]
                const href = sectionToHref(basePath, section, tenantSlug)
                const isActive =
                  pathname === href ||
                  (href !== basePath && pathname.startsWith(href))
                const Icon = meta.icon

                if (showLabels) {
                  return (
                    <Link
                      key={section}
                      href={href}
                      onClick={onItemClick}
                      className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 truncate font-medium">{meta.label}</span>
                      {meta.placeholder && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      )}
                    </Link>
                  )
                }

                return (
                  <Link
                    key={section}
                    href={href}
                    onClick={onItemClick}
                    className={`group relative flex flex-col items-center gap-1 rounded-md py-2 transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={meta.label}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium leading-none text-center">
                      {meta.label}
                    </span>
                    {meta.placeholder && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </Link>
                )
              })}
            </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  const renderHeader = (showLabels: boolean, onItemClick?: () => void) => (
    <>
      <div>
        {!showLabels && (
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            CMS
          </p>
        )}

        {/* Switcher strutture */}
        <div ref={switcherRef} className="relative mt-1 mb-2">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className={`flex w-full items-center gap-1 rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 ${
              showLabels ? 'justify-between px-3 py-2 text-sm' : 'justify-center px-1 py-1.5 text-xs'
            }`}
            title={entityName}
          >
            <span className="truncate font-medium">{entityName}</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${
                switcherOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {switcherOpen && (
            <div
              className={`absolute z-50 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-xl ${
                showLabels ? 'left-0 top-full mt-1' : 'left-full top-0 ml-2'
              }`}
            >
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
                      onClick={() => {
                        setSwitcherOpen(false)
                        onItemClick?.()
                      }}
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
                  onClick={() => { setSwitcherOpen(false); onItemClick?.() }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <span>Vedi tutte le strutture</span>
                </Link>
                <Link
                  href={`/${tenantSlug}/stays/new`}
                  onClick={() => { setSwitcherOpen(false); onItemClick?.() }}
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
          <div className={`mb-2 ${showLabels ? 'px-3' : 'text-center'}`}>
            <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
              Gestita da agenzia
            </span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Bottone hamburger mobile — visibile solo < lg */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-16 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm lg:hidden"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Sidebar desktop (≥ lg) */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-20' : 'w-56'
        }`}
      >
        <div
          className="sticky top-16 flex flex-col px-1"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          {/* Toggle collapse — IN ALTO, sempre visibile, fuori dallo scroll */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="mb-2 mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50"
            aria-label={collapsed ? 'Espandi menu' : 'Comprimi menu'}
            title={collapsed ? 'Espandi menu' : 'Comprimi menu'}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Comprimi</span>
              </>
            )}
          </button>

          {/* Area scrollabile: header + nav */}
          <div className="flex-1 space-y-2 overflow-y-auto pb-4">
            {renderHeader(!collapsed)}
            {renderNav(!collapsed)}
          </div>
        </div>
      </aside>

      {/* Drawer mobile (< lg) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-gray-200 bg-white px-3 pb-6 pt-4 shadow-xl lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Chiudi menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {renderHeader(true, () => setMobileOpen(false))}
              {renderNav(true, () => setMobileOpen(false))}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
