import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function IntegrationsIndexPage({ params }: PageProps) {
  const { tenantSlug, entitySlug } = await params
  redirect(`/${tenantSlug}/stays/${entitySlug}/channels`)
}
