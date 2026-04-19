import type { ReactNode } from 'react'
import { GlobalFooter } from '@/components/layout/GlobalFooter'

interface Props {
  children: ReactNode
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantPublicLayout({ children, params }: Props) {
  const { tenantSlug } = await params
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <GlobalFooter tenantSlug={tenantSlug} />
    </div>
  )
}
