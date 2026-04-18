import { createServiceRoleClient } from '@touracore/db/server'
import { ConfigForm } from './config-form'

export const dynamic = 'force-dynamic'

export default async function PlatformConfigPage() {
  const supabase = await createServiceRoleClient()
  const { data: config } = await supabase
    .from('platform_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Config plans + commissioni</h1>
        <p className="mt-1 text-sm text-slate-600">
          Editor platform-wide: prezzi piani, tier commissioni per vertical, platform fee.
        </p>
      </header>

      <ConfigForm
        plans={config?.plans ?? {}}
        commissionTiers={config?.commission_tiers ?? {}}
        platformFeeRate={config?.platform_fee_rate ?? 0.02}
      />
    </div>
  )
}
