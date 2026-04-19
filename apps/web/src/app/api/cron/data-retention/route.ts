import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RetentionPolicy {
  table_name: string
  ttl_days: number
  legal_basis: string
  hard_delete_column: string
  exception_reason: string | null
  enabled: boolean
}

interface PurgeStat {
  table: string
  action: 'purge' | 'skip' | 'error'
  rows?: number
  reason?: string
  error?: string
}

export async function GET(req: Request) {
  return handler(req)
}

export async function POST(req: Request) {
  return handler(req)
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === '1'

  const supabase = await createServiceRoleClient()
  const stats: PurgeStat[] = []

  // 1. Retention purge per policy
  const { data: policies } = await supabase
    .from('data_retention_policy')
    .select('table_name, ttl_days, legal_basis, hard_delete_column, exception_reason, enabled')
    .eq('enabled', true)

  for (const policy of (policies ?? []) as RetentionPolicy[]) {
    if (policy.exception_reason) {
      stats.push({
        table: policy.table_name,
        action: 'skip',
        reason: policy.exception_reason,
      })
      continue
    }

    const cutoff = new Date(Date.now() - policy.ttl_days * 86400_000).toISOString()
    const col = policy.hard_delete_column || 'created_at'

    if (dryRun) {
      const { count } = await supabase
        .from(policy.table_name)
        .select('*', { count: 'exact', head: true })
        .lt(col, cutoff)
      stats.push({ table: policy.table_name, action: 'purge', rows: count ?? 0, reason: 'dry-run' })
      continue
    }

    const { error, count } = await supabase
      .from(policy.table_name)
      .delete({ count: 'exact' })
      .lt(col, cutoff)

    if (error) {
      stats.push({ table: policy.table_name, action: 'error', error: error.message })
    } else {
      stats.push({ table: policy.table_name, action: 'purge', rows: count ?? 0 })
      await supabase
        .from('data_retention_policy')
        .update({
          last_purge_at: new Date().toISOString(),
          rows_purged_last: count ?? 0,
        })
        .eq('table_name', policy.table_name)
    }
  }

  // 2. Hard delete scheduled user deletion requests
  const nowIso = new Date().toISOString()
  const { data: due } = await supabase
    .from('user_deletion_requests')
    .select('user_id')
    .is('canceled_at', null)
    .is('hard_deleted_at', null)
    .lt('scheduled_hard_delete_at', nowIso)

  let hardDeleted = 0
  for (const row of (due ?? []) as Array<{ user_id: string }>) {
    if (dryRun) {
      hardDeleted++
      continue
    }
    // Call Supabase auth admin delete — fiscal docs preserved via FK ON DELETE SET NULL
    const { error } = await supabase.auth.admin.deleteUser(row.user_id)
    if (error) {
      stats.push({ table: 'auth.users', action: 'error', error: `user ${row.user_id}: ${error.message}` })
      continue
    }
    await supabase
      .from('user_deletion_requests')
      .update({ hard_deleted_at: nowIso })
      .eq('user_id', row.user_id)
    hardDeleted++
  }

  stats.push({ table: 'auth.users', action: 'purge', rows: hardDeleted })

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    executed_at: nowIso,
    stats,
    total_policies: policies?.length ?? 0,
    hard_deletions: hardDeleted,
  })
}
