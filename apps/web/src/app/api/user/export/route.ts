import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tabelle da includere nell'export GDPR Art.15 + Art.20 (portability)
// Scoped a user_id o created_by = user.id
const USER_DATA_SOURCES: Array<{
  table: string
  user_column: string
  label: string
}> = [
  { table: 'user_profiles', user_column: 'user_id', label: 'Profilo utente' },
  { table: 'reservations', user_column: 'guest_user_id', label: 'Prenotazioni' },
  { table: 'media', user_column: 'created_by', label: 'Media caricati' },
  { table: 'audit_logs', user_column: 'actor_id', label: 'Audit log azioni' },
  { table: 'cookie_consent_records', user_column: 'user_id', label: 'Consensi cookie' },
  { table: 'dsar_requests', user_column: 'user_id', label: 'Richieste DSAR precedenti' },
  { table: 'notification_preferences', user_column: 'user_id', label: 'Preferenze notifiche' },
  { table: 'notification_deliveries', user_column: 'user_id', label: 'Notifiche inviate' },
]

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()

  // Log DSAR request
  await supabase.from('dsar_requests').insert({
    user_id: user.id,
    request_type: 'export',
    status: 'processing',
    request_payload: { sources: USER_DATA_SOURCES.map((s) => s.table) },
  })

  const exportData: Record<string, unknown> = {
    export_metadata: {
      user_id: user.id,
      user_email: user.email,
      exported_at: new Date().toISOString(),
      gdpr_basis: 'Art.15 Right of access + Art.20 Data portability',
      format: 'JSON',
    },
  }

  for (const source of USER_DATA_SOURCES) {
    try {
      const { data, error } = await supabase
        .from(source.table)
        .select('*')
        .eq(source.user_column, user.id)

      if (error) {
        exportData[source.table] = { error: error.message, label: source.label }
      } else {
        exportData[source.table] = { rows: data ?? [], label: source.label, count: data?.length ?? 0 }
      }
    } catch (e) {
      exportData[source.table] = {
        error: e instanceof Error ? e.message : 'unknown',
        label: source.label,
      }
    }
  }

  // Mark request completed
  await supabase
    .from('dsar_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('request_type', 'export')
    .eq('status', 'processing')

  const json = JSON.stringify(exportData, null, 2)
  const filename = `touracore-user-data-${user.id.slice(0, 8)}-${Date.now()}.json`

  return new Response(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
