'use client'

import { useEffect, useRef } from 'react'
import { BookingEngine, type BookingContext } from '@touracore/hospitality/src/components/booking'
import { createServerActionAdapter } from '../../book/[slug]/booking-adapter'

/**
 * Client wrapper embed: posta altezza contenuto al parent window ad ogni mutation.
 * Parent ascolta con: window.addEventListener('message', e => iframe.style.height = e.data.height + 'px')
 */
export function EmbedClient({ context }: { context: BookingContext }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const el = rootRef.current

    function post() {
      const height = el.getBoundingClientRect().height
      window.parent?.postMessage({ type: 'touracore:resize', height, slug: context.property.slug }, '*')
    }
    post()

    const ro = new ResizeObserver(() => post())
    ro.observe(el)

    const mo = new MutationObserver(() => post())
    mo.observe(el, { childList: true, subtree: true, attributes: true })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [context.property.slug])

  const adapter = createServerActionAdapter({})

  return (
    <div ref={rootRef}>
      <BookingEngine context={context} adapter={adapter} />
    </div>
  )
}
