import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'

export async function GET(req: Request, ctxReq: { params: Promise<{ agencySlug: string }> }) {
  const { agencySlug } = await ctxReq.params
  const ctx = await getVisibilityContext()
  if (!ctx.user) return NextResponse.redirect(new URL('/login', req.url))
  if (!hasPermission(ctx, 'billing.read') && !ctx.isPlatformAdmin) return new NextResponse('Forbidden', { status: 403 })

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id').eq('slug', agencySlug).maybeSingle()
  if (!agency) return new NextResponse('Not found', { status: 404 })

  const { data: rows } = await supabase
    .from('agency_commissions')
    .select('accrued_at, reservation_type, tenant_id, gross_amount, commission_rate, commission_amount, currency, status')
    .eq('agency_id', agency.id)
    .order('accrued_at', { ascending: false })

  const header = 'date,type,tenant_id,gross,rate,commission,currency,status\n'
  const body = (rows ?? [])
    .map((r) => [
      r.accrued_at.slice(0, 10),
      r.reservation_type,
      r.tenant_id ?? '',
      r.gross_amount,
      r.commission_rate,
      r.commission_amount,
      r.currency,
      r.status,
    ].join(','))
    .join('\n')

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="commissions-${agencySlug}.csv"`,
    },
  })
}
