import { RatePlansPage } from '../../../_shared/rate-plans/RatePlansPage'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ tenantSlug: string; entitySlug: string }> }) {
  const p = await params
  return <RatePlansPage tenantSlug={p.tenantSlug} entitySlug={p.entitySlug} vertical="bike" />
}
