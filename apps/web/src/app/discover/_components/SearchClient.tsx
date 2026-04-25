'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'

interface Props {
  placeholder: string
  accentClass: string
  extraFields?: { name: string; label: string; options: { value: string; label: string }[] }[]
}

export function SearchClient({ placeholder, accentClass, extraFields = [] }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [extras, setExtras] = useState<Record<string, string>>(
    Object.fromEntries(extraFields.map((f) => [f.name, params.get(f.name) ?? '']))
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams(params.toString())
    if (q) next.set('q', q)
    else next.delete('q')
    for (const [k, v] of Object.entries(extras)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    startTransition(() => router.replace(`/discover?${next.toString()}`, { scroll: false }))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-stretch">
      <label className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pl-11 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </label>

      {extraFields.map((f) => (
        <select
          key={f.name}
          value={extras[f.name] ?? ''}
          onChange={(e) => setExtras((s) => ({ ...s, [f.name]: e.target.value }))}
          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      <button
        type="submit"
        disabled={pending}
        className={`h-12 rounded-xl px-6 text-[14px] font-semibold text-white transition disabled:opacity-60 ${accentClass}`}
      >
        {pending ? 'Cerca…' : 'Cerca'}
      </button>
    </form>
  )
}
