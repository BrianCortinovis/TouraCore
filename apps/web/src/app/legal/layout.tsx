import type { ReactNode } from 'react'
import { GlobalFooter } from '@/components/layout/GlobalFooter'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main id="main-content" className="flex-1 max-w-4xl mx-auto w-full px-6 py-12" tabIndex={-1}>
        <article className="prose prose-slate max-w-none bg-white rounded-lg shadow-sm p-8 md:p-12">
          {children}
        </article>
      </main>
      <GlobalFooter />
    </div>
  )
}
