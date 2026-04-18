'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, SVGProps } from 'react'

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

  return (
    <aside className="w-72 shrink-0">
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
    </aside>
  )
}
