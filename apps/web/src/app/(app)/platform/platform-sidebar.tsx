'use client'

import {
  Building2,
  Briefcase,
  Cog,
  CreditCard,
  LayoutDashboard,
  Layers3,
  Shield,
  Terminal,
} from 'lucide-react'
import { SharedSidebar } from '../../../components/SharedSidebar'

interface PlatformSidebarProps {
  email: string
  role: 'admin' | 'super_admin'
}

export function PlatformSidebar({ email, role }: PlatformSidebarProps) {
  return (
    <SharedSidebar
      scope="platform"
      title="Control Room"
      subtitle={`${role === 'super_admin' ? 'Super Admin' : 'Admin'} · ${email}`}
      badge="Platform"
      groups={[
        {
          title: 'Command',
          items: [
            { href: '/platform', label: 'Overview', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          title: 'Business',
          items: [
            { href: '/platform/agencies', label: 'Agenzie', icon: Briefcase },
            { href: '/platform/clients', label: 'Clienti', icon: Building2 },
            { href: '/platform/billing', label: 'Billing', icon: CreditCard },
          ],
        },
        {
          title: 'Config',
          items: [
            { href: '/platform/config', label: 'Plans+Commissioni', icon: Layers3 },
          ],
        },
        {
          title: 'Ops',
          items: [
            { href: '/platform/tech', label: 'Tech Ops', icon: Terminal },
            { href: '/platform/security', label: 'Sicurezza', icon: Shield },
            { href: '/superadmin', label: 'Legacy', icon: Cog },
          ],
        },
      ]}
    />
  )
}
