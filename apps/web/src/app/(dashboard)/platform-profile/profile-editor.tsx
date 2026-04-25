'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import type { ProfileFormState } from './actions'
import { saveProfileAction } from './actions'
import { MediaPicker, type MediaPickerSelection } from '@/components/media/media-picker'

type Props = { state: ProfileFormState }

const MODES: Array<{ key: 'multi' | 'singles' | 'mixed'; title: string; desc: string }> = [
  { key: 'multi',   title: 'Booking unico',       desc: 'Una sola CTA grande che porta al booking engine del tenant' },
  { key: 'singles', title: 'Booking per scheda',  desc: 'Ogni scheda mostra una CTA separata' },
  { key: 'mixed',   title: 'Entrambi',             desc: 'CTA unica in alto + CTA per scheda' },
]

export function ProfileEditor({ state }: Props) {
  const [username, setUsername] = useState(state.profile.username)
  const [displayName, setDisplayName] = useState(state.profile.display_name)
  const [introHeadline, setIntroHeadline] = useState(state.profile.intro_headline)
  const [introDescription, setIntroDescription] = useState(state.profile.intro_description)
  const [mode, setMode] = useState(state.profile.default_booking_mode)
  const [isPublic, setIsPublic] = useState(state.profile.is_public)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    state.availableListings.filter((l) => l.selected).map((l) => l.listing_id)
  )
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(state.profile.avatar_media_id)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(state.profile.avatar_url)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  function toggleListing(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function move(id: string, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const a = next[idx]!
      const b = next[target]!
      next[idx] = b
      next[target] = a
      return next
    })
  }

  function save() {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const res = await saveProfileAction({
        username,
        display_name: displayName,
        intro_headline: introHeadline || null,
        intro_description: introDescription || null,
        default_booking_mode: mode,
        is_public: isPublic,
        listing_ids: selectedIds,
        avatar_media_id: avatarMediaId,
      })
      if (res.success) setMsg('Profilo salvato ✓')
      else setErr(res.error ?? 'Errore')
    })
  }

  const publicUrl = isPublic && username ? `/u/${username}` : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Il mio profilo pubblico</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Personalizza la tua homepage /u/{username || '{username}'} e scegli quali attività mostrare.
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>
      ) : null}
      {err ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</div> : null}

      <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Identità</h2>

        <div className="mb-5 flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="80px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-gray-400">👤</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen(true)}
              className="rounded-md border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
            >
              {avatarUrl ? 'Cambia avatar' : 'Scegli avatar'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarMediaId(null)
                  setAvatarUrl(null)
                }}
                className="rounded-md border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Rimuovi
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Username · URL /u/username
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2 font-mono text-[14px]"
              placeholder="villa-irabo"
              maxLength={40}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Nome visibile
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
              maxLength={100}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Frase di intro (sotto titolo)
          </span>
          <input
            type="text"
            value={introHeadline}
            onChange={(e) => setIntroHeadline(e.target.value)}
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
            maxLength={200}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Descrizione lunga (opzionale)
          </span>
          <textarea
            value={introDescription}
            onChange={(e) => setIntroDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-[14px]"
            maxLength={2000}
          />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Profilo pubblico (altrimenti è privato)
        </label>
      </section>

      <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Modalità booking engine</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MODES.map((m) => (
            <label
              key={m.key}
              className={[
                'cursor-pointer rounded-md border p-4 transition',
                mode === m.key ? 'border-[#003b95] bg-[#e7f0ff]' : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]',
              ].join(' ')}
            >
              <input
                type="radio"
                name="mode"
                className="sr-only"
                checked={mode === m.key}
                onChange={() => setMode(m.key)}
              />
              <div className="font-bold text-[14px]">{m.title}</div>
              <div className="mt-1 text-[12px] text-[#6b7280]">{m.desc}</div>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
        <h2 className="mb-2 text-lg font-bold">Attività esposte</h2>
        <p className="mb-4 text-sm text-[#6b7280]">
          {selectedIds.length} selezionate · solo le attività già pubbliche possono essere esposte.
        </p>
        <ul className="space-y-2">
          {state.availableListings.map((l) => {
            const selectedIndex = selectedIds.indexOf(l.listing_id)
            const isSelected = selectedIndex >= 0
            return (
              <li
                key={l.listing_id}
                className={[
                  'flex items-center gap-3 rounded-md border px-4 py-3',
                  isSelected ? 'border-[#003b95] bg-[#e7f0ff]' : 'border-[#e5e7eb] bg-white',
                  !l.is_public ? 'opacity-50' : '',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  disabled={!l.is_public}
                  checked={isSelected}
                  onChange={() => toggleListing(l.listing_id)}
                />
                <div className="flex-1">
                  <div className="font-semibold">{l.entity_name}</div>
                  <div className="text-[12px] text-[#6b7280]">
                    {l.entity_kind.replace('_', ' ')}
                    {!l.is_public ? ' · non pubblica' : ''}
                  </div>
                </div>
                {isSelected ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(l.listing_id, -1)}
                      className="rounded border border-[#d1d5db] bg-white px-2 py-1 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(l.listing_id, 1)}
                      className="rounded border border-[#d1d5db] bg-white px-2 py-1 text-xs"
                    >
                      ↓
                    </button>
                    <span className="ml-2 rounded bg-[#003b95] px-2 py-1 text-xs font-bold text-white">
                      #{selectedIndex + 1}
                    </span>
                  </div>
                ) : null}
              </li>
            )
          })}
          {state.availableListings.length === 0 ? (
            <li className="rounded-md border border-dashed border-[#d1d5db] p-6 text-center text-sm text-[#6b7280]">
              Nessuna attività disponibile. Pubblicane alcune da /settings/distribution.
            </li>
          ) : null}
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !username || !displayName}
          className="rounded-md bg-[#003b95] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-[#003b95] hover:underline"
          >
            Apri {publicUrl} ↗
          </a>
        ) : null}
      </div>

      <MediaPicker
        open={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        onSelect={(m: MediaPickerSelection) => {
          setAvatarMediaId(m.id)
          setAvatarUrl(m.url)
        }}
        title="Scegli avatar"
      />
    </div>
  )
}
