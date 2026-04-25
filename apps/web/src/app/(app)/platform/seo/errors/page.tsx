import { createServerSupabaseClient } from '@touracore/db/server'
import { AlertCircle } from 'lucide-react'
import { SeoTabs } from '../seo-tabs'
import { Errors404Manager } from './errors-manager'

export const dynamic = 'force-dynamic'

export default async function Errors404Page() {
  const supabase = await createServerSupabaseClient()

  const { data: errors } = await supabase
    .from('platform_404_log')
    .select('id, path, referrer, user_agent, hit_count, first_seen_at, last_seen_at, resolved')
    .order('hit_count', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          Errori 404
        </h1>
        <p className="mt-1 text-sm text-gray-500">Path che ritornano 404 più frequenti — opportunità di redirect</p>
      </header>

      <SeoTabs />

      <Errors404Manager initial={errors ?? []} />
    </div>
  )
}
