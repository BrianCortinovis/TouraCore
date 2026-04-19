'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createRestaurantEntityAction,
  createBikeRentalEntityAction,
  createExperienceEntityAction,
  createGenericEntityAction,
} from './kind-actions'

type Kind = 'restaurant' | 'bike' | 'experience' | 'wellness' | 'moto' | 'ski'

interface Props {
  kind: Kind
}

const TITLES: Record<Kind, { title: string; subtitle: string; placeholder: string }> = {
  restaurant: {
    title: 'Il tuo ristorante',
    subtitle: 'Inserisci nome e indirizzo. Sale e menu li configuri dopo.',
    placeholder: 'Trattoria del Borgo',
  },
  bike: {
    title: 'Il tuo noleggio bike',
    subtitle: 'Location di partenza. Flotta e tariffe le imposti dopo.',
    placeholder: 'Alpina Bikes Gardone',
  },
  experience: {
    title: 'La tua esperienza',
    subtitle: 'Nome e categoria. Slot e guide li aggiungi dopo.',
    placeholder: 'Tour Dolomiti',
  },
  wellness: {
    title: 'La tua SPA',
    subtitle: 'Nome e indirizzo. Cabine e trattamenti dopo.',
    placeholder: 'Wellness Garda',
  },
  moto: {
    title: 'Il tuo noleggio moto',
    subtitle: 'Location. Flotta e patenti dopo.',
    placeholder: 'Moto Rental Milano',
  },
  ski: {
    title: 'La tua scuola sci',
    subtitle: 'Nome scuola. Maestri e lezioni dopo.',
    placeholder: 'Scuola Sci Madonna',
  },
}

const EXPERIENCE_CATEGORIES = [
  { value: 'guided_tour', label: 'Tour guidato' },
  { value: 'snow_sport', label: 'Sport invernali' },
  { value: 'water_sport', label: 'Sport acquatici' },
  { value: 'adventure_park', label: 'Parco avventura' },
  { value: 'tasting', label: 'Degustazione' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'wellness_experience', label: 'Esperienza wellness' },
  { value: 'other', label: 'Altro' },
]

export function KindWizard({ kind }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [capacity, setCapacity] = useState('')
  const [category, setCategory] = useState('guided_tour')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const meta = TITLES[kind]

  function submit() {
    setErr(null)
    start(async () => {
      const base = { name, address: address || undefined, city: city || undefined, zip: zip || undefined }
      let res: { success: boolean; error?: string; tenantSlug?: string | null } | null = null
      if (kind === 'restaurant') {
        res = await createRestaurantEntityAction({ ...base, capacity: capacity ? Number(capacity) : undefined })
      } else if (kind === 'bike') {
        res = await createBikeRentalEntityAction({ ...base, capacity: capacity ? Number(capacity) : undefined })
      } else if (kind === 'experience') {
        res = await createExperienceEntityAction({ ...base, category })
      } else {
        const genericKind = kind === 'wellness' ? 'wellness' : kind === 'moto' ? 'moto_rental' : 'ski_school'
        res = await createGenericEntityAction({ ...base, kind: genericKind })
      }
      if (!res?.success) {
        setErr(res?.error ?? 'unknown_error')
        return
      }
      if (res.tenantSlug) router.push(`/${res.tenantSlug}`)
      else router.push('/')
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Step 5 · Prima entità</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{meta.subtitle}</p>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-700">Nome</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={meta.placeholder}
            />
          </label>

          {kind === 'experience' && (
            <label className="block text-sm">
              <span className="text-slate-700">Categoria</span>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPERIENCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(kind === 'restaurant' || kind === 'bike') && (
            <label className="block text-sm">
              <span className="text-slate-700">
                {kind === 'restaurant' ? 'Coperti totali' : 'Bike in flotta'}
              </span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="text-slate-700">Indirizzo</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-700">Città</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">CAP</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </label>
          </div>
        </div>

        {err && <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">Errore: {err}</p>}

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            disabled={pending || name.trim().length < 2}
            onClick={submit}
            className="rounded bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? 'Creazione…' : 'Crea e continua'}
          </button>
        </div>
      </div>
    </div>
  )
}
