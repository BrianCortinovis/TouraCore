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
      badge="Agency"
      groups={[
        {
          title: 'Command',
          items: [
            { href: prefix, label: 'Overview', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          title: 'Business',
          items: [
            { href: `${prefix}/clients`, label: 'Clienti', icon: Building2 },
            { href: `${prefix}/commissions`, label: 'Commissioni', icon: Receipt },
            { href: `${prefix}/billing`, label: 'Billing', icon: CreditCard },
          ],
        },
        {
          title: 'Team',
          items: [
            { href: `${prefix}/team`, label: 'Team', icon: Users },
            { href: `${prefix}/messaging`, label: 'Messaging', icon: MessageSquare },
            { href: `${prefix}/settings`, label: 'Impostazioni', icon: Settings },
          ],
        },
      ]}
    />
  )
}
