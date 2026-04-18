'use client'

import { useMemo, useState } from 'react'
import type { DistributionEntityRow } from '../distribution/actions'

type EmbedMode = 'listing' | 'booking_single' | 'booking_multi'

interface Props {
  rows: DistributionEntityRow[]
  tenantSlug: string
}

const KIND_LABEL: Record<string, string> = {
  accommodation: 'Struttura',
  restaurant: 'Ristorante',
  activity: 'Esperienza',
  wellness: 'Spa / Wellness',
  bike_rental: 'Noleggio bici',
  moto_rental: 'Noleggio moto',
  ski_school: 'Scuola sci',
}

const MODE_META: Record<EmbedMode, { label: string; description: string; sizeHint: string }> = {
  listing: {
    label: 'Scheda attività',
    description: 'Compatta (titolo + tagline + servizi + CTA) — ideale sidebar/card promo',
    sizeHint: '560×320',
  },
  booking_single: {
    label: 'Booking engine singolo',
    description: 'Widget prenotazione completo per una sola attività',
    sizeHint: '100%×720',
  },
  booking_multi: {
    label: 'Booking engine multi-attività',
    description: 'Picker con più attività del tenant — user seleziona quale servizio prenotare',
    sizeHint: '100%×600',
  },
}

export function EmbedStudioClient({ rows, tenantSlug }: Props) {
  const publicRows = rows.filter((r) => r.is_public && r.is_active)
  const [mode, setMode] = useState<EmbedMode>('booking_multi')
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState(720)
  const [customOrigin, setCustomOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const origin =
    customOrigin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://touracore.vercel.app')

  const selectedEntities = useMemo(
    () => publicRows.filter((r) => selectedEntityIds.has(r.entity_id)),
    [publicRows, selectedEntityIds],
  )

  const singleEntity =
    mode === 'booking_single' || mode === 'listing' ? selectedEntities[0] : null

  const embedSrc = useMemo(() => {
    if (!tenantSlug) return ''
    if (mode === 'listing' && singleEntity) {
      return `${origin}/embed/listing/${tenantSlug}/${singleEntity.entity_slug}`
    }
    if (mode === 'booking_single' && singleEntity) {
      return `${origin}/embed/booking/${tenantSlug}/${singleEntity.entity_slug}`
    }
    if (mode === 'booking_multi') {
      const slugs = selectedEntities.map((e) => e.entity_slug).join(',')
      const qs = slugs ? `?entities=${encodeURIComponent(slugs)}` : ''
      return `${origin}/embed/booking-multi/${tenantSlug}${qs}`
    }
    return ''
  }, [mode, tenantSlug, singleEntity, selectedEntities, origin])

  const iframeSnippet = embedSrc
    ? `<iframe\n  src="${embedSrc}"\n  width="${width}"\n  height="${height}"\n  frameborder="0"\n  style="border:0;max-width:100%;"\n  title="Prenota online"\n></iframe>`
    : ''

  const scriptSnippet = embedSrc
    ? `<div id="touracore-embed"></div>\n<script>\n(function(){\n  var f = document.createElement('iframe');\n  f.src = "${embedSrc}";\n  f.width = "${width}";\n  f.height = "${height}";\n  f.frameBorder = "0";\n  f.style.border = "0";\n  f.style.maxWidth = "100%";\n  f.title = "Prenota online";\n  document.getElementById("touracore-embed").appendChild(f);\n})();\n</script>`
    : ''

  const toggleEntity = (id: string) => {
    setSelectedEntityIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        if (mode === 'booking_single' || mode === 'listing') next.clear()
        next.add(id)
      }
      return next
    })
  }

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied('err')
    }
  }

  const canPreview = embedSrc !== '' && (
    (mode === 'booking_multi') ||
    ((mode === 'listing' || mode === 'booking_single') && singleEntity !== undefined)
  )

  const disabledNotice =
    publicRows.length === 0
      ? 'Nessuna attività pubblica. Attiva le attività da Distribuzione per poterle embeddare.'
      : null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Embed Studio</h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea snippet iframe per incorporare schede o booking engine (singolo / multi-attività) nel tuo sito.
          Scegli tu cosa esporre.
        </p>
      </header>

      {disabledNotice && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {disabledNotice}
        </div>
      )}

      {/* Step 1: mode */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">1. Tipo di embed</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(MODE_META) as EmbedMode[]).map((m) => {
            const meta = MODE_META[m]
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setSelectedEntityIds(new Set())
                }}
                className={`rounded-md border p-3 text-left transition-colors ${
                  active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                <p className="mt-1 text-xs text-gray-600">{meta.description}</p>
                <p className="mt-2 text-[10px] font-mono uppercase text-gray-400">{meta.sizeHint}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Step 2: entities picker */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            2. {mode === 'booking_multi' ? 'Scegli attività (opzionale, vuoto = tutte)' : 'Scegli attività'}
          </h2>
          {mode === 'booking_multi' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedEntityIds(new Set(publicRows.map((r) => r.entity_id)))}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Tutte
              </button>
              <span className="text-xs text-gray-300">·</span>
              <button
                type="button"
                onClick={() => setSelectedEntityIds(new Set())}
                className="text-xs font-medium text-gray-600 hover:underline"
              >
                Nessuna
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {mode === 'booking_multi'
            ? 'Se non selezioni nulla, saranno mostrate tutte le attività pubbliche.'
            : mode === 'listing'
              ? 'Una sola scheda visibile nell’embed.'
              : 'Il booking engine mostrerà solo questa attività.'}
        </p>

        {publicRows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">—</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {publicRows.map((r) => {
              const checked = selectedEntityIds.has(r.entity_id)
              return (
                <label
                  key={r.entity_id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                    checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type={mode === 'booking_multi' ? 'checkbox' : 'radio'}
                    name="entity_pick"
                    checked={checked}
                    onChange={() => toggleEntity(r.entity_id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{r.entity_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {KIND_LABEL[r.entity_kind] ?? r.entity_kind} · /{r.entity_slug}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {mode !== 'booking_multi' && selectedEntities.length === 0 && publicRows.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Seleziona 1 attività per generare lo snippet.
          </p>
        )}
      </section>

      {/* Step 3: dimensions */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">3. Dimensioni</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-gray-600">Larghezza</span>
            <input
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="100% o 600"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-gray-600">Altezza px</span>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-gray-600">Origine personalizzata</span>
            <input
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              placeholder="https://touracore.vercel.app"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Step 4: snippets */}
      {canPreview && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">4. Codice embed</h2>
              <a
                href={embedSrc}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Apri anteprima ↗
              </a>
            </div>

            <div className="mt-3 space-y-4">
              <Snippet
                label="iframe (raccomandato per WordPress, Squarespace, Wix, statico)"
                code={iframeSnippet}
                copiedKey={copied}
                thisKey="iframe"
                onCopy={() => copy(iframeSnippet, 'iframe')}
              />
              <Snippet
                label="Script (inject dinamico, utile per SPA e headless CMS)"
                code={scriptSnippet}
                copiedKey={copied}
                thisKey="script"
                onCopy={() => copy(scriptSnippet, 'script')}
              />
              <Snippet
                label="URL diretto (link share o sorgente personalizzato)"
                code={embedSrc}
                copiedKey={copied}
                thisKey="url"
                onCopy={() => copy(embedSrc, 'url')}
              />
            </div>
          </section>

          {/* Step 5: preview live */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              5. Anteprima live
            </h2>
            <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
              <iframe
                src={embedSrc}
                width={width}
                height={height}
                style={{ border: 0, maxWidth: '100%' }}
                title="Embed preview"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Snippet({
  label,
  code,
  copiedKey,
  thisKey,
  onCopy,
}: {
  label: string
  code: string
  copiedKey: string | null
  thisKey: string
  onCopy: () => void
}) {
  const isCopied = copiedKey === thisKey
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${
            isCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isCopied ? 'Copiato ✓' : 'Copia'}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}
