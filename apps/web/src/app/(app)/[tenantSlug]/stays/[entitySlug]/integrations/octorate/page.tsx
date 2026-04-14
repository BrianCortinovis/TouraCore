import { redirect } from 'next/navigation'

interface OctoratePageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

// Redirect verso il nuovo hub Channel Manager
export default async function OctorateRedirect({ params }: OctoratePageProps) {
  const { tenantSlug, entitySlug } = await params
  redirect(`/${tenantSlug}/stays/${entitySlug}/channels`)
}
