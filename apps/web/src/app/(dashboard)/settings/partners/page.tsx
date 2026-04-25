import { redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { listPartners, listPartnerCommissions } from '@touracore/partners/server'
import { PartnersAdminClient } from './partners-admin-client'

export const dynamic = 'force-dynamic'

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
