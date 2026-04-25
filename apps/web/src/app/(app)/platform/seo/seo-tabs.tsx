'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gauge, ListChecks, Map, Repeat, AlertCircle, Settings as SettingsIcon } from 'lucide-react'

const TABS = [
  { href: '/platform/seo', label: 'Dashboard', icon: Gauge, exact: true },
  { href: '/platform/seo/listings', label: 'Listings SEO', icon: ListChecks },
  { href: '/platform/seo/sitemap', label: 'Sitemap', icon: Map },
  { href: '/platform/seo/redirects', label: 'Redirect 301', icon: Repeat },
  { href: '/platform/seo/errors', label: 'Errori 404', icon: AlertCircle },
  { href: '/platform/seo/settings', label: 'Impostazioni', icon: SettingsIcon },
]

export function SeoTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${
              active
                ? 'border-blue-600 font-medium text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
