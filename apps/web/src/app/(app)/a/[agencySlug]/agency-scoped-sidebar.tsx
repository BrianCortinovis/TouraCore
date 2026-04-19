'use client'

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  MessageSquare,
  Receipt,
  Settings,
  Users,
  Megaphone,
  LineChart,
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
          title: 'Clienti',
          items: [
            { href: `${prefix}/clients`, label: 'Elenco clienti', icon: Building2 },
            { href: `${prefix}/broadcast`, label: 'Avvisi', icon: Megaphone },
            { href: `${prefix}/reports`, label: 'Report', icon: LineChart },
          ],
        },
        {
          title: 'Finanze',
          items: [
            { href: `${prefix}/commissions`, label: 'Commissioni', icon: Receipt },
            { href: `${prefix}/billing`, label: 'Fatturazione', icon: CreditCard },
          ],
        },
        {
          title: 'Organizzazione',
          items: [
            { href: `${prefix}/team`, label: 'Collaboratori', icon: Users },
            { href: `${prefix}/messaging`, label: 'Messaggistica', icon: MessageSquare },
            { href: `${prefix}/settings`, label: 'Impostazioni', icon: Settings },
          ],
        },
      ]}
    />
  )
}
