import { createServerSupabaseClient } from '@touracore/db/server'
import { Repeat } from 'lucide-react'
import { SeoTabs } from '../seo-tabs'
import { RedirectsManager } from './redirects-manager'

export const dynamic = 'force-dynamic'

export default async function RedirectsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: redirects } = await supabase
    .from('platform_redirects')
    .select('id, source_path, target_path, redirect_type, is_active, hit_count, last_hit_at, notes, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Repeat className="h-6 w-6 text-blue-600" />
          Redirect 301
        </h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci redirect persistenti tra path della piattaforma</p>
      </header>

      <SeoTabs />

      <RedirectsManager initial={redirects ?? []} />
    </div>
  )
}
