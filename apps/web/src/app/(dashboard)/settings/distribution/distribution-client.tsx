'use client'

import { useState, useTransition } from 'react'
import { togglePublicListingAction, type DistributionEntityRow } from './actions'

type Props = {
  rows: DistributionEntityRow[]
  tenantSlug: string
}

const KIND_LABEL: Record<string, string> = {
  accommodation: 'Alloggio',
  restaurant: 'Ristorante',
  activity: 'Esperienza',
  wellness: 'Spa / Wellness',
  bike_rental: 'Noleggio bici',
  moto_rental: 'Noleggio moto',
  ski_school: 'Scuola sci',
}

export function DistributionClient({ rows: initialRows, tenantSlug }: Props) {
  const [rows, setRows] = useState(initialRows)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function toggle(entityId: string, currentPublic: boolean) {
    setError(null)
    setBusyId(entityId)
    startTransition(async () => {
      const res = await togglePublicListingAction({ entityId, isPublic: !currentPublic })
      if (!res.success) {
        setError(res.error ?? 'Errore durante aggiornamento')
        setBusyId(null)
        return
      }
      setRows((prev) =>
        prev.map((r) =>
          r.entity_id === entityId ? { ...r, is_public: res.isPublic ?? !currentPublic } : r
        )
      )
      setBusyId(null)
    })
  }

  const publicCount = rows.filter((r) => r.is_public).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Distribuzione pubblica</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pubblica o nascondi le schede di ogni attività. Le schede pubbliche sono visibili su{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-800">
            /s/{tenantSlug || '{tenant}'}/{'{entity}'}
          </code>{' '}
          e incluse nel sitemap.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <div>
          <b>{publicCount}</b> / {rows.length} attività pubbliche
        </div>
        <div className="ml-auto flex gap-4">
          <a
            href="/settings/partners"
            className="font-semibold text-[#003b95] hover:underline"
          >
            Partners →
          </a>
          <a
            href="/settings/credits"
            className="font-semibold text-[#003b95] hover:underline"
          >
            Credits Studio →
          </a>
          <a
            href="/settings/embed-studio"
            className="font-semibold text-[#003b95] hover:underline"
          >
            Embed Studio →
          </a>
          <a
            href="/sitemap-listings.xml"
            target="_blank"
            rel="noreferrer"
            className="text-[#003b95] hover:underline"
          >
            Vedi sitemap →
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Attività</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold">Slug</th>
              <th className="px-4 py-3 text-left font-semibold">Pubblicata il</th>
              <th className="px-4 py-3 text-left font-semibold">Anteprima</th>
              <th className="px-4 py-3 text-left font-semibold">Personalizza</th>
              <th className="px-4 py-3 text-right font-semibold">Stato pubblico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const busy = busyId === r.entity_id && pending
              const url = tenantSlug && r.is_public ? `/s/${tenantSlug}/${r.entity_slug}` : null
              return (
                <tr key={r.entity_id} className={r.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.entity_name}
                    {!r.is_active ? (
                      <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                        Disattivata
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {KIND_LABEL[r.entity_kind] ?? r.entity_kind}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.entity_slug}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.published_at
                      ? new Date(r.published_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#003b95] hover:underline"
                      >
                        Apri ↗
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/settings/distribution/${r.entity_id}`}
                      className="text-[#003b95] hover:underline"
                    >
                      Modifica
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy || !r.is_active}
                      onClick={() => toggle(r.entity_id, r.is_public)}
                      className={[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        r.is_public ? 'bg-[#003b95]' : 'bg-gray-300',
                        busy || !r.is_active ? 'cursor-not-allowed opacity-60' : '',
                      ].join(' ')}
                      aria-label={r.is_public ? 'Rendi privata' : 'Pubblica'}
                    >
                      <span
                        className={[
                          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                          r.is_public ? 'translate-x-5' : 'translate-x-0.5',
                        ].join(' ')}
                      />
                    </button>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {r.is_public ? 'Pubblica' : 'Nascosta'}
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nessuna attività. Aggiungi entity al tenant per pubblicare schede.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
