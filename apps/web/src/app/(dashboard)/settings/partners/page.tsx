import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { listPartners, listPartnerCommissions } from '@touracore/partners/server'
import { Badge } from '@touracore/ui'
import { PartnersAdminClient } from './partners-admin-client'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  hotel: 'Hotel',
  tour_operator: 'Tour Operator',
  travel_agent: 'Travel Agent',
  influencer: 'Influencer',
  ota: 'OTA',
  affiliate: 'Affiliate',
  corporate: 'Corporate',
  other: 'Altro',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-gray-200 text-gray-700',
  terminated: 'bg-red-100 text-red-800',
}

export default async function PartnersPage() {
  const b = await getAuthBootstrapData()
  if (!b.tenant) redirect('/login')

  const [partners, pending] = await Promise.all([
    listPartners({ tenantId: b.tenant.id }),
    listPartnerCommissions({ tenantId: b.tenant.id, status: 'earned' }),
  ])

  const totalPending = pending.reduce((a, b) => a + Number(b.commission_amount), 0)

  return (
    <PartnersAdminClient
      partners={partners}
      tenantSlug={b.tenant.slug ?? ''}
      totalPending={totalPending}
      pendingCount={pending.length}
      activeCount={partners.filter((p) => p.status === 'active').length}
    />
  )
}
