'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Button } from '@touracore/ui'
import { Star, Trash2, ArrowUp, ArrowDown, ImagePlus, Film, Plus } from 'lucide-react'
import { MediaPicker, type MediaPickerSelection } from '@/components/media/media-picker'
import {
  attachListingMediaAction,
  attachVideoLinkAction,
  detachListingMediaAction,
  setListingHeroAction,
  reorderListingMediaAction,
  type GalleryItem,
  type GalleryState,
} from './actions'

interface Props {
  initial: GalleryState
}

export function GalleryEditor({ initial }: Props) {
  const [state, setState] = useState<GalleryState>(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [heroPickerOpen, setHeroPickerOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const photoCount = state.items.filter((i) => i.media_kind !== 'video').length
  const videoCount = state.items.filter((i) => i.media_kind === 'video').length

  async function refresh() {
    const { loadGalleryStateAction } = await import('./actions')
    const r = await loadGalleryStateAction(state.entityId)
    if (r.success && r.data) setState(r.data)
  }

  async function onAttach(picks: MediaPickerSelection[]) {
    if (picks.length === 0) return
    setMsg(null)
    start(async () => {
      const r = await attachListingMediaAction({
        entityId: state.entityId,
        mediaIds: picks.map((p) => p.id),
      })
      if (!r.success) setMsg(`Errore: ${r.error}`)
      else setMsg(`${r.added} foto aggiunte`)
      await refresh()
    })
  }

  async function onSetHero(media: MediaPickerSelection) {
    setMsg(null)
    start(async () => {
      const r = await setListingHeroAction({ entityId: state.entityId, mediaId: media.id })
      if (!r.success) setMsg(`Errore: ${r.error}`)
      await refresh()
    })
  }

  async function onSetHeroFromGallery(item: GalleryItem) {
    setMsg(null)
    start(async () => {
      const r = await setListingHeroAction({ entityId: state.entityId, mediaId: item.media_id })
      if (!r.success) setMsg(`Errore: ${r.error}`)
      await refresh()
    })
  }

  async function onDetach(item: GalleryItem) {
    setMsg(null)
    start(async () => {
      const r = await detachListingMediaAction({ entityId: state.entityId, pivotId: item.id })
      if (!r.success) setMsg(`Errore: ${r.error}`)
      await refresh()
    })
  }

  async function onAddVideo() {
    const trimmed = videoUrl.trim()
    if (!trimmed) return
    setMsg(null)
    start(async () => {
      const r = await attachVideoLinkAction({ entityId: state.entityId, url: trimmed })
      if (!r.success) {
        setMsg(r.error === 'INVALID_VIDEO_URL' ? 'URL non valido. Usa link YouTube o Vimeo.' : `Errore: ${r.error}`)
      } else {
        setMsg('Video aggiunto')
        setVideoUrl('')
      }
      await refresh()
    })
  }

  async function onMove(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= state.items.length) return
    const newOrder = [...state.items]
    const [moved] = newOrder.splice(index, 1)
    if (!moved) return
    newOrder.splice(target, 0, moved)
    setState({ ...state, items: newOrder })
    start(async () => {
      await reorderListingMediaAction({
        entityId: state.entityId,
        pivotIds: newOrder.map((i) => i.id),
      })
      await refresh()
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery · {state.entityName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Foto pubbliche su <code className="rounded bg-gray-100 px-1">/s/{state.tenantSlug}/{state.entitySlug}</code>
            {!state.isPublic && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Listing non pubblicato</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setHeroPickerOpen(true)}>
            <Star className="mr-1 h-4 w-4" /> Imposta hero
          </Button>
          <Button type="button" onClick={() => setPickerOpen(true)} disabled={pending}>
            <ImagePlus className="mr-1 h-4 w-4" /> Aggiungi foto
          </Button>
        </div>
      </header>

      {msg && <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}</div>}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">Hero corrente</h2>
        <div className="mt-3">
          {state.heroUrl ? (
            <div className="relative h-48 w-full max-w-md overflow-hidden rounded-md bg-gray-100">
              <Image src={state.heroUrl} alt="Hero" fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nessun hero impostato. Le foto della gallery non avranno una copertina principale.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">Aggiungi video YouTube / Vimeo</h2>
        <p className="mt-1 text-xs text-gray-500">
          Incolla URL pubblico (es. <code className="rounded bg-gray-100 px-1">https://youtu.be/abc123</code>). Il video viene mostrato nella gallery pubblica con player embed.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={pending}
          />
          <Button type="button" onClick={onAddVideo} disabled={pending || !videoUrl.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Aggiungi video
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Gallery ({photoCount} foto{videoCount > 0 ? ` · ${videoCount} video` : ''})
        </h2>
        {state.items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-sm text-gray-500">Nessuna foto nella gallery.</p>
            <Button type="button" onClick={() => setPickerOpen(true)} className="mt-3">
              Aggiungi le prime foto
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {state.items.map((item, idx) => (
              <li
                key={item.id}
                className={`group relative overflow-hidden rounded-md border bg-white shadow-sm ${
                  item.is_hero ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'
                }`}
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  {item.media_kind === 'video' ? (
                    <>
                      {item.video_thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.video_thumbnail_url}
                          alt={item.alt_text ?? item.video_title ?? 'Video'}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow">
                          <Film className="h-5 w-5 text-gray-900" />
                        </div>
                      </div>
                      <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                        {item.video_platform}
                      </span>
                    </>
                  ) : (
                    item.url && (
                      <Image src={item.url} alt={item.alt_text ?? ''} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                    )
                  )}
                  {item.is_hero && (
                    <span className="absolute left-1 top-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      HERO
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => onMove(idx, -1)}
                      disabled={idx === 0 || pending}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Sposta su"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(idx, 1)}
                      disabled={idx === state.items.length - 1 || pending}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Sposta giù"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-0.5">
                    {item.media_kind !== 'video' && (
                      <button
                        type="button"
                        onClick={() => onSetHeroFromGallery(item)}
                        disabled={pending || item.is_hero}
                        className="rounded p-1 text-gray-500 hover:bg-amber-100 disabled:opacity-30"
                        title="Imposta come hero"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDetach(item)}
                      disabled={pending}
                      className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      title="Rimuovi dalla gallery"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={() => undefined}
        onSelectMultiple={onAttach}
        multiple
        title="Aggiungi foto alla gallery"
      />
      <MediaPicker
        open={heroPickerOpen}
        onClose={() => setHeroPickerOpen(false)}
        onSelect={onSetHero}
        title="Seleziona foto hero"
      />
    </div>
  )
}
