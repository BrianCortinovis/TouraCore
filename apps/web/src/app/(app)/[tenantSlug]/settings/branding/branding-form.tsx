'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Button } from '@touracore/ui'
import { Trash2, ImagePlus } from 'lucide-react'
import { MediaPicker, type MediaPickerSelection } from '@/components/media/media-picker'
import { saveTenantBrandingAction, type TenantBrandingState } from './actions'

interface Props {
  initial: TenantBrandingState
}

export function BrandingForm({ initial }: Props) {
  const [logo, setLogo] = useState(initial.logo)
  const [cover, setCover] = useState(initial.cover)
  const [color, setColor] = useState(initial.brandColor ?? '#003b95')
  const [logoOpen, setLogoOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    setMsg(null)
    start(async () => {
      const r = await saveTenantBrandingAction({
        brandColor: color || null,
        logoMediaId: logo?.id ?? null,
        coverMediaId: cover?.id ?? null,
      })
      setMsg(r.success ? 'Branding salvato.' : `Errore: ${r.error}`)
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
        <p className="mt-1 text-sm text-gray-500">
          Logo, copertina e colore primario per il widget di prenotazione e la scheda pubblica.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Logo</h2>
          <p className="text-xs text-gray-500">Apparirà sull&apos;header del booking widget e nella scheda pubblica.</p>
          <div className="mt-3 flex items-center gap-4">
            {logo ? (
              <div className="relative h-20 w-40 overflow-hidden rounded border border-gray-200 bg-white">
                <Image src={logo.url} alt="Logo" fill className="object-contain p-2" sizes="160px" />
              </div>
            ) : (
              <div className="flex h-20 w-40 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                Nessun logo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="outline" type="button" onClick={() => setLogoOpen(true)}>
                <ImagePlus className="mr-1 h-4 w-4" /> {logo ? 'Cambia' : 'Scegli'}
              </Button>
              {logo && (
                <Button variant="outline" type="button" onClick={() => setLogo(null)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Rimuovi
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700">Copertina (cover)</h2>
          <p className="text-xs text-gray-500">Hero immagine in cima al widget multi-servizio.</p>
          <div className="mt-3 flex items-center gap-4">
            {cover ? (
              <div className="relative h-32 w-64 overflow-hidden rounded border border-gray-200 bg-gray-100">
                <Image src={cover.url} alt="Cover" fill className="object-cover" sizes="256px" />
              </div>
            ) : (
              <div className="flex h-32 w-64 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                Nessuna copertina
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="outline" type="button" onClick={() => setCoverOpen(true)}>
                <ImagePlus className="mr-1 h-4 w-4" /> {cover ? 'Cambia' : 'Scegli'}
              </Button>
              {cover && (
                <Button variant="outline" type="button" onClick={() => setCover(null)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Rimuovi
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700">Colore primario</h2>
          <p className="text-xs text-gray-500">Hex usato per CTA, badge e link nella scheda pubblica.</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-28 rounded border border-gray-300 px-3 py-1.5 font-mono text-sm"
              placeholder="#003b95"
              maxLength={7}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">Anteprima</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {cover && (
            <div className="relative h-32 w-full bg-gray-100">
              <Image src={cover.url} alt="" fill className="object-cover" sizes="600px" />
            </div>
          )}
          <div className="flex items-center gap-3 p-4" style={{ backgroundColor: color, color: '#fff' }}>
            {logo && (
              <div className="relative h-10 w-10 overflow-hidden rounded bg-white/10">
                <Image src={logo.url} alt="" fill className="object-contain" sizes="40px" />
              </div>
            )}
            <div>
              <p className="font-bold">{initial.tenantName}</p>
              <p className="text-xs opacity-90">Prenota — esempio header</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? 'Salvo…' : 'Salva branding'}
        </Button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </div>

      <MediaPicker
        open={logoOpen}
        onClose={() => setLogoOpen(false)}
        onSelect={(m: MediaPickerSelection) => setLogo({ id: m.id, url: m.url })}
        title="Scegli logo"
      />
      <MediaPicker
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        onSelect={(m: MediaPickerSelection) => setCover({ id: m.id, url: m.url })}
        title="Scegli copertina"
      />
    </div>
  )
}
