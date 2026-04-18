'use client'

import { useState, useTransition } from 'react'
import { AMENITY_KEYS, AMENITIES, type AmenityKey } from '@touracore/listings'
import { updateListingCurationAction } from '../actions'

type Props = {
  entityId: string
  entitySlug: string
  tenantSlug: string
  initial: {
    tagline: string
    featured: string[]
    seoTitle: string
    seoDescription: string
    isPublic: boolean
  }
}

export function CurationEditor({ entityId, entitySlug, tenantSlug, initial }: Props) {
  const [tagline, setTagline] = useState(initial.tagline)
  const [featured, setFeatured] = useState<string[]>(initial.featured)
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle)
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function toggleAmenity(k: string) {
    setFeatured((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  function save() {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const res = await updateListingCurationAction({
        entityId,
        tagline: tagline || null,
        featuredAmenities: featured,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      })
      if (res.success) setMsg('Salvato ✓')
      else setErr(res.error ?? 'Errore')
    })
  }

  const publicUrl = tenantSlug && initial.isPublic ? `/s/${tenantSlug}/${entitySlug}` : null

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>
      ) : null}
      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</div>
      ) : null}

      <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Contenuto editoriale</h2>

        <label className="mb-4 block">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Tagline (frase breve mostrata sotto il titolo)
          </span>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Es. Villa privata sul Lago di Como con piscina infinity e pontile riservato"
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
          />
          <span className="mt-1 block text-right text-[11px] text-[#6b7280]">
            {tagline.length}/500
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
            SEO title (mostrato nel tab browser e nei risultati Google)
          </span>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            maxLength={200}
            placeholder="Lascia vuoto per fallback automatico"
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
            SEO description (meta description Google, 150–160 caratteri ideale)
          </span>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
          />
          <span className="mt-1 block text-right text-[11px] text-[#6b7280]">
            {seoDescription.length}/500
          </span>
        </label>
      </section>

      <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
        <h2 className="mb-2 text-lg font-bold">Servizi in evidenza</h2>
        <p className="mb-4 text-sm text-[#6b7280]">
          {featured.length} selezionati · questi compaiono nella sezione amenities della scheda pubblica
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {AMENITY_KEYS.map((k) => {
            const selected = featured.includes(k)
            const descriptor = AMENITIES[k as AmenityKey]
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleAmenity(k)}
                className={[
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] transition',
                  selected
                    ? 'border-[#003b95] bg-[#e7f0ff] text-[#003b95]'
                    : 'border-[#e5e7eb] bg-white text-[#1f2937] hover:border-[#d1d5db]',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded border text-[10px]',
                    selected ? 'border-[#003b95] bg-[#003b95] text-white' : 'border-[#d1d5db]',
                  ].join(' ')}
                >
                  {selected ? '✓' : ''}
                </span>
                <span>{descriptor.label_it}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-[#003b95] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        {publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-[#003b95] hover:underline"
          >
            Anteprima pubblica ↗
          </a>
        ) : (
          <span className="text-sm text-[#6b7280]">Pubblica la scheda per vedere l'anteprima</span>
        )}
      </div>
    </div>
  )
}
