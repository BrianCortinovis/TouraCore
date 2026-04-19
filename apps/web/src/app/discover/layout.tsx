import type { ReactNode } from 'react'
import { GlobalFooter } from '@/components/layout/GlobalFooter'

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <GlobalFooter />
    </div>
  )
}
