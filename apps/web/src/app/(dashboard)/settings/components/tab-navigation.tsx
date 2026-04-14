'use client'

import { cn } from '@touracore/ui'

export type SettingsTab = 'business' | 'invoicing' | 'checkin' | 'communications' | 'profile'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'business', label: 'Dati della tua attività' },
  { id: 'invoicing', label: 'Fatturazione' },
  { id: 'checkin', label: 'Check-in / Check-out' },
  { id: 'communications', label: 'Comunicazioni' },
  { id: 'profile', label: 'Il tuo profilo' },
]

interface TabNavigationProps {
  active: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export function TabNavigation({ active, onChange }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Sezioni impostazioni">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
              active === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
