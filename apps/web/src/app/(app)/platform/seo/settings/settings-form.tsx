'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { saveSeoSettingsAction } from './actions'

interface Settings {
  default_title_template: string | null
  default_description: string | null
  default_og_image_url: string | null
  robots_txt_override: string | null
  google_site_verification: string | null
  bing_site_verification: string | null
  ga4_measurement_id: string | null
  ga4_api_secret: string | null
  ga4_enabled: boolean
  search_console_property: string | null
  custom_head_tags: string | null
}

export function SeoSettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS({ ...s, [key]: value })
  }

  function handleSave() {
    setResult(null)
    startTransition(async () => {
      const res = await saveSeoSettingsAction(s)
      setResult(res.ok ? { ok: true, msg: 'Impostazioni salvate' } : { ok: false, msg: res.error })
    })
  }

  return (
    <div className="space-y-6">
      <Section title="Meta default" desc="Fallback usato quando un listing non ha override specifici">
        <Field label="Title template" hint="%s = nome pagina">
          <input value={s.default_title_template ?? ''} onChange={(e)=>update('default_title_template', e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="%s — TouraCore" />
        </Field>
        <Field label="Description default" hint="Max 160 caratteri">
          <textarea value={s.default_description ?? ''} onChange={(e)=>update('default_description', e.target.value)} rows={2} maxLength={160} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">{(s.default_description ?? '').length}/160</p>
        </Field>
        <Field label="OG image default" hint="URL assoluto o relativo (es. /opengraph-image)">
          <input value={s.default_og_image_url ?? ''} onChange={(e)=>update('default_og_image_url', e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </Field>
      </Section>

      <Section title="Google Analytics 4" desc="Inserisci Measurement ID per attivare GA4 in produzione (consent-aware)">
        <div className="flex items-center gap-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span>GA4 si attiva automaticamente solo dopo che imposti Measurement ID e flag attivo. Il banner cookie rispetta il consenso.</span>
        </div>
        <Field label="Measurement ID" hint="Formato: G-XXXXXXXX">
          <input value={s.ga4_measurement_id ?? ''} onChange={(e)=>update('ga4_measurement_id', e.target.value)} placeholder="G-XXXXXXXX" className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="API secret (Measurement Protocol)" hint="Per eventi server-side (opzionale)">
          <input type="password" value={s.ga4_api_secret ?? ''} onChange={(e)=>update('ga4_api_secret', e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={s.ga4_enabled} onChange={(e)=>update('ga4_enabled', e.target.checked)} />
            <span className="text-sm">Attiva GA4 in produzione</span>
          </label>
        </Field>
      </Section>

      <Section title="Verifica motori di ricerca" desc="Codici di verifica per Search Console e Bing Webmaster">
        <Field label="Google site verification" hint="Solo il codice (senza meta tag completo)">
          <input value={s.google_site_verification ?? ''} onChange={(e)=>update('google_site_verification', e.target.value)} placeholder="abc123..." className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="Bing site verification">
          <input value={s.bing_site_verification ?? ''} onChange={(e)=>update('bing_site_verification', e.target.value)} placeholder="abc123..." className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="Search Console property URL">
          <input value={s.search_console_property ?? ''} onChange={(e)=>update('search_console_property', e.target.value)} placeholder="https://touracore.com/" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </Field>
      </Section>

      <Section title="Avanzate" desc="Per esigenze specifiche (override robots, head custom)">
        <Field label="Robots.txt override" hint="Sostituisce robots.txt auto-generato. Lascia vuoto per usare quello automatico.">
          <textarea value={s.robots_txt_override ?? ''} onChange={(e)=>update('robots_txt_override', e.target.value)} rows={6} className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" placeholder="User-agent: *&#10;Allow: /&#10;Sitemap: ..." />
        </Field>
        <Field label="Custom head tags" hint="Iniettato nel <head> di ogni pagina. Use con cautela.">
          <textarea value={s.custom_head_tags ?? ''} onChange={(e)=>update('custom_head_tags', e.target.value)} rows={4} className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" placeholder='<meta property="..." />' />
        </Field>
      </Section>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 flex items-center justify-between">
        <div>
          {result && (
            <div className={`flex items-center gap-2 text-sm ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
              {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {result.msg}
            </div>
          )}
        </div>
        <button onClick={handleSave} disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Save className="h-4 w-4" />
          {pending ? 'Salvataggio...' : 'Salva impostazioni'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{desc}</p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
