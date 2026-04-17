import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

interface AccountingAdapter {
  provider: string
  pushInvoice(invoice: Record<string, unknown>, creds: Record<string, unknown>): Promise<{ externalId: string } | null>
  pushPayment(payment: Record<string, unknown>, creds: Record<string, unknown>): Promise<{ externalId: string } | null>
}

const xeroAdapter: AccountingAdapter = {
  provider: 'xero',
  async pushInvoice(_inv, _creds) { return null },
  async pushPayment(_p, _creds) { return null },
}
const quickbooksAdapter: AccountingAdapter = {
  provider: 'quickbooks',
  async pushInvoice(_inv, _creds) { return null },
  async pushPayment(_p, _creds) { return null },
}
const fattura24Adapter: AccountingAdapter = {
  provider: 'fattura24',
  async pushInvoice(_inv, _creds) { return null },
  async pushPayment(_p, _creds) { return null },
}
const teamsystemAdapter: AccountingAdapter = {
  provider: 'teamsystem',
  async pushInvoice(_inv, _creds) { return null },
  async pushPayment(_p, _creds) { return null },
}

const accountingAdapters: Record<string, AccountingAdapter> = {
  xero: xeroAdapter,
  quickbooks: quickbooksAdapter,
  fattura24: fattura24Adapter,
  teamsystem: teamsystemAdapter,
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: connections } = await supabase
    .from('accounting_connections')
    .select('*')
    .eq('is_active', true)

  const results: Array<{ connectionId: string; provider: string; pushed: number; errors: number }> = []

  for (const conn of connections ?? []) {
    const adapter = accountingAdapters[conn.provider]
    if (!adapter) continue

    const { data: pendingInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', conn.tenant_id)
      .is('external_accounting_id', null)
      .limit(50)

    let pushed = 0
    let errors = 0

    for (const inv of pendingInvoices ?? []) {
      try {
        const result = await adapter.pushInvoice(inv, conn.credentials as Record<string, unknown>)
        await supabase.from('accounting_sync_logs').insert({
          connection_id: conn.id,
          resource_type: 'invoice',
          resource_id: inv.id,
          external_id: result?.externalId ?? null,
          direction: 'push',
          status: result ? 'success' : 'skipped_not_configured',
        })
        if (result) pushed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown'
        await supabase.from('accounting_sync_logs').insert({
          connection_id: conn.id,
          resource_type: 'invoice',
          resource_id: inv.id,
          direction: 'push',
          status: 'error',
          error_message: msg,
        })
        errors++
      }
    }

    await supabase
      .from('accounting_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors > 0 ? 'partial' : 'success',
      })
      .eq('id', conn.id)

    results.push({ connectionId: conn.id, provider: conn.provider, pushed, errors })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
