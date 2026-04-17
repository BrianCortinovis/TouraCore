'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@touracore/ui'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1 text-gray-700">{children}</label>
}
import { Check, Copy, Eye, ExternalLink, KeyRound, Palette, Plus, Trash2 } from 'lucide-react'
import type { BookingTemplate, BookingTheme } from '@touracore/hospitality/src/components/booking'
import { THEME_PRESETS } from '@touracore/hospitality/src/components/booking/core/theme'
import { saveBookingEngineConfig, createPublicApiKey, revokePublicApiKey } from './actions'

interface Props {
  tenantSlug: string
  entity: { id: string; slug: string; name: string }
  initialTemplate: BookingTemplate
  initialTheme: BookingTheme
  apiKeys: Array<{
    id: string
    key_prefix: string
    name: string
    allowed_domains: string[]
    scopes: string[]
    is_active: boolean
    last_used_at: string | null
    created_at: string
    expires_at: string | null
  }>
}

type Section = 'design' | 'preview' | 'embed' | 'api'

export function BookingEngineAdminClient(props: Props) {
  const [section, setSection] = useState<Section>('design')
  const [template, setTemplate] = useState<BookingTemplate>(props.initialTemplate)
  const [theme, setTheme] = useState<BookingTheme>(props.initialTheme)
  const [saving, startSave] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const bookingUrl = `${baseUrl}/book/${props.entity.slug}`
  const embedUrl = `${baseUrl}/embed/${props.entity.slug}`

  function onSave() {
    startSave(async () => {
      const res = await saveBookingEngineConfig({ entityId: props.entity.id, template, theme })
      if (res.success) setSavedAt(new Date())
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Configura il motore di prenotazione pubblico per {props.entity.name}</p>
        </div>
        <div className="flex gap-2">
          <a href={bookingUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50">
            <ExternalLink className="h-4 w-4" /> Apri pubblico
          </a>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Salvo...' : 'Salva modifiche'}
          </Button>
        </div>
      </div>

      {savedAt && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 px-3 py-2 rounded flex items-center gap-2">
          <Check className="h-4 w-4" /> Configurazione salvata
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'design', label: 'Design', icon: Palette },
          { id: 'preview', label: 'Preview live', icon: Eye },
          { id: 'embed', label: 'Codice embed', icon: Copy },
          { id: 'api', label: 'API keys', icon: KeyRound },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id as Section)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${section === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            <t.icon className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            {t.label}
          </button>
        ))}
      </div>

      {section === 'design' && <DesignPanel template={template} setTemplate={setTemplate} theme={theme} setTheme={setTheme} />}
      {section === 'preview' && <PreviewPanel slug={props.entity.slug} template={template} theme={theme} />}
      {section === 'embed' && <EmbedPanel slug={props.entity.slug} baseUrl={baseUrl} embedUrl={embedUrl} bookingUrl={bookingUrl} template={template} />}
      {section === 'api' && <ApiKeysPanel entityId={props.entity.id} keys={props.apiKeys} />}
    </div>
  )
}

function DesignPanel({ template, setTemplate, theme, setTheme }: {
  template: BookingTemplate
  setTemplate: (t: BookingTemplate) => void
  theme: BookingTheme
  setTheme: (t: BookingTheme) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'minimal', title: 'Minimal', desc: 'Booking.com-like: dense, trust badges, sticky summary. Max conversione.' },
            { id: 'luxury', title: 'Luxury', desc: 'Boutique hotel: hero full-bleed, storytelling, photo cards. Alto posizionamento.' },
            { id: 'mobile', title: 'Mobile-first', desc: 'Airbnb-like: single-column step-by-step, sticky footer. Per mobile nativo.' },
          ].map((t) => (
            <label key={t.id} className={`block border rounded-lg p-4 cursor-pointer transition ${template === t.id ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" name="template" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id as BookingTemplate)} className="mr-2" />
              <strong>{t.title}</strong>
              <p className="text-sm text-gray-600 mt-1 ml-6">{t.desc}</p>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Colori e font</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Colore primario</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={theme.accent_color} onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })} className="w-12 h-10 border rounded cursor-pointer" />
              <Input value={theme.accent_color} onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })} className="flex-1" />
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {Object.entries(THEME_PRESETS).map(([name, preset]) => (
                <button
                  key={name}
                  onClick={() => setTheme({ ...theme, ...preset })}
                  title={name}
                  className="w-7 h-7 rounded-full border-2 border-white shadow hover:scale-110 transition"
                  style={{ backgroundColor: preset.accent_color }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Bordo (radius)</Label>
            <select value={theme.border_radius} onChange={(e) => setTheme({ ...theme, border_radius: e.target.value as BookingTheme['border_radius'] })} className="w-full border rounded px-3 py-2">
              <option value="none">Squadrato</option>
              <option value="sm">Leggero</option>
              <option value="md">Medio</option>
              <option value="lg">Arrotondato</option>
              <option value="full">Pill</option>
            </select>
          </div>

          <div>
            <Label>Font family</Label>
            <select value={theme.font_family} onChange={(e) => setTheme({ ...theme, font_family: e.target.value as BookingTheme['font_family'] })} className="w-full border rounded px-3 py-2">
              <option value="system">System (Inter-like)</option>
              <option value="serif">Serif (Playfair)</option>
              <option value="display">Display (Poppins)</option>
              <option value="custom">Custom</option>
            </select>
            {theme.font_family === 'custom' && (
              <Input className="mt-2" placeholder='es. "Montserrat", sans-serif' value={theme.font_family_custom ?? ''} onChange={(e) => setTheme({ ...theme, font_family_custom: e.target.value })} />
            )}
          </div>

          <div>
            <Label>Logo URL (opzionale)</Label>
            <Input placeholder="https://..." value={theme.logo_url ?? ''} onChange={(e) => setTheme({ ...theme, logo_url: e.target.value })} />
          </div>

          <div>
            <Label>Hero image (solo template luxury)</Label>
            <Input placeholder="https://..." value={theme.hero_image_url ?? ''} onChange={(e) => setTheme({ ...theme, hero_image_url: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={theme.show_powered_by} onChange={(e) => setTheme({ ...theme, show_powered_by: e.target.checked })} />
            Mostra "Powered by TouraCore"
          </label>
        </CardContent>
      </Card>
    </div>
  )
}

function PreviewPanel({ slug, template, theme }: { slug: string; template: BookingTemplate; theme: BookingTheme }) {
  const accent = theme.accent_color.replace('#', '')
  const src = `/embed/${slug}?template=${template}&accent=${accent}&t=${Date.now()}`
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview live — {template}</CardTitle>
        <p className="text-xs text-gray-500 mt-1">Il preview mostra il template corrente. Salva per renderlo effettivo per i visitatori.</p>
      </CardHeader>
      <CardContent>
        <iframe
          src={src}
          style={{ width: '100%', minHeight: 680, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
          title="Booking engine preview"
        />
      </CardContent>
    </Card>
  )
}

function EmbedPanel({ slug, baseUrl, embedUrl, bookingUrl, template }: any) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const iframeSnippet = `<!-- TouraCore Booking Engine -->
<iframe
  id="touracore-booking"
  src="${embedUrl}"
  style="width:100%; border:0; min-height:600px;"
  title="Booking"
  loading="lazy"
></iframe>
<script>
(function(){
  window.addEventListener('message', function(e){
    if (e.data && e.data.type === 'touracore:resize' && e.data.slug === '${slug}') {
      var f = document.getElementById('touracore-booking');
      if (f) f.style.height = e.data.height + 'px';
    }
    if (e.data && e.data.type === 'touracore:redirect' && e.data.url) {
      window.location.href = e.data.url;
    }
  });
})();
</script>`

  const scriptSnippet = `<!-- Link to hosted booking engine -->
<a href="${bookingUrl}" target="_blank" rel="noopener">
  Prenota online
</a>`

  const sdkSnippet = `// Install
pnpm add @touracore/booking-sdk

// Use (React)
import { useTouraBooking } from '@touracore/booking-sdk/react'

function MyBookingUI() {
  const { context, search, availability, createBooking, payAndRedirect } =
    useTouraBooking({
      baseUrl: '${baseUrl}',
      slug: '${slug}',
    })

  // Costruisci la tua UI, SDK gestisce API + Stripe checkout
}`

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Iframe embed (rapido)</CardTitle>
          <p className="text-xs text-gray-500">Copia questo snippet nel HTML del tuo sito. Si ridimensiona automaticamente.</p>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded overflow-auto">
            <code>{iframeSnippet}</code>
          </pre>
          <Button onClick={() => copy('iframe', iframeSnippet)} variant="outline" className="mt-2">
            {copied === 'iframe' ? <><Check className="h-4 w-4 mr-2" /> Copiato</> : <><Copy className="h-4 w-4 mr-2" /> Copia codice iframe</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Link diretto (più semplice)</CardTitle>
          <p className="text-xs text-gray-500">Aggiungi un pulsante che apre il booking in nuova tab.</p>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded overflow-auto">
            <code>{scriptSnippet}</code>
          </pre>
          <Button onClick={() => copy('link', scriptSnippet)} variant="outline" className="mt-2">
            {copied === 'link' ? <><Check className="h-4 w-4 mr-2" /> Copiato</> : <><Copy className="h-4 w-4 mr-2" /> Copia link</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Sito custom nativo (@touracore/booking-sdk)</CardTitle>
          <p className="text-xs text-gray-500">Per siti realizzati internamente: UI 100% tua, API + Stripe checkout gestiti dal SDK.</p>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded overflow-auto">
            <code>{sdkSnippet}</code>
          </pre>
          <Button onClick={() => copy('sdk', sdkSnippet)} variant="outline" className="mt-2">
            {copied === 'sdk' ? <><Check className="h-4 w-4 mr-2" /> Copiato</> : <><Copy className="h-4 w-4 mr-2" /> Copia snippet SDK</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ApiKeysPanel({ entityId, keys }: { entityId: string; keys: Props['apiKeys'] }) {
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<{ name: string; domains: string }>({ name: '', domains: '' })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [, startTr] = useTransition()
  const [keyList, setKeyList] = useState(keys)

  async function onCreate() {
    const domains = newKey.domains.split(',').map((s) => s.trim()).filter(Boolean)
    const res = await createPublicApiKey({
      entityId,
      name: newKey.name || 'Default',
      allowedDomains: domains,
    })
    if (res.success && res.fullKey) {
      setCreatedKey(res.fullKey)
      setCreating(false)
      setNewKey({ name: '', domains: '' })
      // optimistic reload: user vedrà al prossimo refresh
    }
  }

  async function onRevoke(id: string) {
    if (!confirm('Revocare definitivamente questa API key?')) return
    startTr(async () => {
      await revokePublicApiKey(id)
      setKeyList(keyList.map((k) => k.id === id ? { ...k, is_active: false } : k))
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>API Keys pubbliche</CardTitle>
        <Button onClick={() => setCreating(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Nuova key</Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 mb-3">
          Le API key pubbliche servono solo se vuoi restringere gli embed a determinati domini.
          Per uso base (widget iframe su qualunque sito) non servono.
        </p>

        {createdKey && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded mb-4">
            <div className="font-semibold text-amber-900">⚠️ Key creata — copiala ora, non sarà più visibile</div>
            <code className="block mt-2 text-xs bg-white p-2 rounded border break-all select-all">{createdKey}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); setCreatedKey(null) }} className="mt-2">Copia e chiudi</Button>
          </div>
        )}

        {creating && (
          <div className="p-4 border rounded mb-4 space-y-2">
            <Input placeholder="Nome (es. Sito ufficiale)" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} />
            <Input placeholder="Domini consentiti (es. hotel.com, www.hotel.com)" value={newKey.domains} onChange={(e) => setNewKey({ ...newKey, domains: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" onClick={onCreate}>Crea key</Button>
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {keyList.length === 0 && <p className="text-sm text-gray-500">Nessuna API key creata.</p>}
          {keyList.map((k) => (
            <div key={k.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{k.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  <code>{k.key_prefix}_••••••••</code>
                  {k.allowed_domains?.length > 0 && <span className="ml-2">· {k.allowed_domains.join(', ')}</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {k.last_used_at ? `Usata: ${new Date(k.last_used_at).toLocaleDateString('it-IT')}` : 'Mai usata'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {k.is_active ? <Badge variant="secondary">Attiva</Badge> : <Badge variant="outline">Revocata</Badge>}
                {k.is_active && (
                  <Button size="sm" variant="ghost" onClick={() => onRevoke(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
