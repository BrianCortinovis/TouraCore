'use client'

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  MessageSquare,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { SharedSidebar } from '../../../../components/SharedSidebar'

interface AgencyScopedSidebarProps {
  agencySlug: string
  agencyName: string
  plan: string | null
}

export function AgencyScopedSidebar({ agencySlug, agencyName, plan }: AgencyScopedSidebarProps) {
  const prefix = `/a/${agencySlug}`
  return (
    <SharedSidebar
      scope="agency"
      title={agencyName}
      subtitle={plan ?? undefined}
      badge="Agenzia"
      groups={[
        {
          title: 'Panoramica',
          items: [
            { href: prefix, label: 'Riepilogo', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          title: 'Gestione',
          items: [
            { href: `${prefix}/clients`, label: 'Clienti', icon: Building2 },
            { href: `${prefix}/commissions`, label: 'Commissioni', icon: Receipt },
            { href: `${prefix}/billing`, label: 'Fatturazione', icon: CreditCard },
          ],
        },
        {
          title: 'Collaborazione',
          items: [
            { href: `${prefix}/team`, label: 'Collaboratori', icon: Users },
            { href: `${prefix}/messaging`, label: 'Messaggi', icon: MessageSquare },
            { href: `${prefix}/settings`, label: 'Impostazioni', icon: Settings },
          ],
        },
      ]}
    />
  )
}
