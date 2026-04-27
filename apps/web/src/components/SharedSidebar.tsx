'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ComponentType, type SVGProps } from 'react'

export type SharedSidebarScope = 'platform' | 'agency' | 'tenant'

export interface SharedSidebarItem {
  href: string
  label: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  exact?: boolean
}

export interface SharedSidebarGroup {
  title?: string
  items: SharedSidebarItem[]
}

export interface SharedSidebarProps {
  scope: SharedSidebarScope
  title: string
  subtitle?: string
  badge?: string
  groups: SharedSidebarGroup[]
  signOutHref?: string
}

const SCOPE_CLASS: Record<SharedSidebarScope, { badge: string; active: string }> = {
  platform: { badge: 'from-slate-900 to-slate-700', active: 'bg-slate-900 text-white' },
  agency: { badge: 'from-indigo-900 to-indigo-600', active: 'bg-indigo-600 text-white' },
  tenant: { badge: 'from-emerald-900 to-emerald-600', active: 'bg-emerald-600 text-white' },
}

export function SharedSidebar({
  scope,
  title,
  subtitle,
  badge,
  groups,
  signOutHref = '/auth/signout',
}: SharedSidebarProps) {
  const pathname = usePathname() ?? ''
  const palette = SCOPE_CLASS[scope]
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Chiudi al cambio rotta
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Lock scroll body quando overlay aperto
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const Panel = (
    <div className="sticky top-6 space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className={`rounded-2xl bg-gradient-to-br p-4 text-white ${palette.badge}`}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          {badge ?? scope}
        </p>
        <h2 className="mt-2 text-lg font-semibold">{title}</h2>
        {subtitle ? (
          <p className="mt-1 truncate text-sm text-white/70" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {groups.map((group, gi) => (
        <div key={group.title ?? `group-${gi}`} className="space-y-2">
          {group.title ? (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {group.title}
            </p>
          ) : null}
          <nav className="space-y-1">
            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? `${palette.active} shadow-sm`
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ))}

      <form action={signOutHref} method="POST">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          Esci
        </button>
      </form>
    </div>
  )

  return (
    <>
      {/* Mobile trigger (visible <md) */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Apri menu"
        aria-expanded={isMobileOpen}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 md:block">{Panel}</aside>

      {/* Mobile drawer */}
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-slate-50 p-3 shadow-xl">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Chiudi menu"
              className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
            {Panel}
          </div>
        </div>
      ) : null}
    </>
  )
}
