import { createServerSupabaseClient } from '@touracore/db/server'
import { Settings as SettingsIcon } from 'lucide-react'
import { SeoTabs } from '../seo-tabs'
import { SeoSettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function SeoSettingsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: settings } = await supabase
    .from('seo_settings')
    .select('*')
    .eq('scope', 'platform')
    .single()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-blue-600" />
          Impostazioni SEO
        </h1>
        <p className="mt-1 text-sm text-gray-500">Configurazione globale meta default, GA4, verifiche motori di ricerca e Search Console</p>
      </header>

      <SeoTabs />

      <SeoSettingsForm initial={settings ?? {
        default_title_template: '%s — TouraCore',
        default_description: '',
        default_og_image_url: '/opengraph-image',
        robots_txt_override: '',
        google_site_verification: '',
        bing_site_verification: '',
        ga4_measurement_id: '',
        ga4_api_secret: '',
        ga4_enabled: false,
        search_console_property: '',
        custom_head_tags: '',
      }} />
    </div>
  )
}
