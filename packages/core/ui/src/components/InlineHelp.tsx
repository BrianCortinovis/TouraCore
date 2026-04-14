'use client'

import { useEffect, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '../lib/cn'

interface InlineHelpProps {
  title: string
  description: string
  items?: string[]
  className?: string
}

export function InlineHelp({ title, description, items, className }: InlineHelpProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100"
        aria-label={open ? 'Chiudi aiuto' : 'Apri aiuto'}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 border border-sky-200 bg-white shadow-xl">
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-700">Guida rapida</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm leading-6 text-slate-700">{description}</p>
            {items && items.length > 0 && (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
