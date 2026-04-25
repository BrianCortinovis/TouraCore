'use client'

import {
  Building2,
  Briefcase,
  Cog,
  CreditCard,
  LayoutDashboard,
  Layers3,
  LineChart,
  MessageSquare,
  Search,
  Shield,
  Star,
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
      title="Centro di controllo"
      subtitle={`${role === 'super_admin' ? 'Amministratore capo' : 'Amministratore'} · ${email}`}
      badge="Piattaforma"
      groups={[
        {
          title: 'Panoramica',
          items: [
            { href: '/platform', label: 'Riepilogo', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          title: 'Gestione',
          items: [
            { href: '/platform/agencies', label: 'Agenzie', icon: Briefcase },
            { href: '/platform/clients', label: 'Clienti', icon: Building2 },
            { href: '/platform/billing', label: 'Fatturazione', icon: CreditCard },
          ],
        },
        {
          title: 'Configurazione',
          items: [
            { href: '/platform/config', label: 'Piani e commissioni', icon: Layers3 },
            { href: '/platform/messaging', label: 'Messaggistica', icon: MessageSquare },
          ],
        },
        {
          title: 'Crescita',
          items: [
            { href: '/platform/seo', label: 'SEO', icon: Search },
            { href: '/platform/analytics', label: 'Analytics', icon: LineChart },
            { href: '/platform/reviews', label: 'Recensioni', icon: Star },
          ],
        },
        {
          title: 'Sistema',
          items: [
            { href: '/platform/tech', label: 'Operazioni tecniche', icon: Terminal },
            { href: '/platform/security', label: 'Sicurezza', icon: Shield },
            { href: '/superadmin', label: 'Vecchia console', icon: Cog },
          ],
        },
      ]}
    />
  )
}
