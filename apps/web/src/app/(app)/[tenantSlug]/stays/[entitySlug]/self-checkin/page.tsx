import { getSelfCheckinStatus } from './actions'
import { SelfCheckinClient } from './self-checkin-client'

interface SelfCheckinPageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function SelfCheckinPage({ params }: SelfCheckinPageProps) {
  const { tenantSlug, entitySlug } = await params
  const { enabled, checkinUrl } = await getSelfCheckinStatus(entitySlug)

  return (
    <SelfCheckinClient
      tenantSlug={tenantSlug}
      entitySlug={entitySlug}
      initialEnabled={enabled}
      checkinUrl={checkinUrl}
    />
  )
}
