import { redirect } from 'next/navigation'

interface TenantSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantSettingsPage({ params }: TenantSettingsProps) {
  const { tenantSlug } = await params
  redirect(`/${tenantSlug}/settings/profile`)
}
