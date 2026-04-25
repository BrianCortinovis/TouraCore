import { notFound } from 'next/navigation'
import { loadTenantBrandingAction } from './actions'
import { BrandingForm } from './branding-form'

export default async function TenantBrandingPage() {
  const result = await loadTenantBrandingAction()
  if (!result.success || !result.data) notFound()
  return <BrandingForm initial={result.data} />
}
