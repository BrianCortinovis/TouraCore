import type { ReactNode } from 'react'

/**
 * Layout dedicato /embed/* — rimuove ogni chrome (header, padding, font globali)
 * per iframe integration pulita.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
