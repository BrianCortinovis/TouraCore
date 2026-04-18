import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'

export async function GET(req: Request, ctxReq: { params: Promise<{ agencySlug: string }> }) {
  const { agencySlug } = await ctxReq.params
  const ctx = await getVisibilityContext()
  if (!ctx.user) return NextResponse.redirect(new URL('/login', req.url))

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id').eq('slug', agencySlug).maybeSingle()
  if (!agency) return new NextResponse('Not found', { status: 404 })
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return new NextResponse('Forbidden', { status: 403 })

  const { data: links } = await supabase.from('agency_tenant_links').select('tenant_id').eq('agency_id', agency.id).eq('status', 'active')
  const tenantIds = (links ?? []).map((l) => l.tenant_id as string)
  const { data: entities } = tenantIds.length > 0
    ? await supabase.from('entities').select('id, tenant_id').in('tenant_id', tenantIds)
    : { data: [] as { id: string; tenant_id: string }[] }
  const entityIds = (entities ?? []).map((e) => e.id)

  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()
  const { data: resv } = entityIds.length > 0
    ? await supabase.from('reservations')
        .select('reservation_code, created_at, total_amount, status, entity_id, check_in, check_out, currency')
        .in('entity_id', entityIds)
        .gte('created_at', sixMonthsAgo)
    : { data: [] as Array<{ reservation_code: string; created_at: string; total_amount: number; status: string; entity_id: string; check_in: string; check_out: string; currency: string }> }

  const header = 'code,created_at,total,currency,status,entity_id,check_in,check_out\n'
  const body = (resv ?? []).map((r) => [
    r.reservation_code,
    r.created_at.slice(0, 10),
    r.total_amount,
    r.currency ?? 'EUR',
    r.status,
    r.entity_id,
    r.check_in,
    r.check_out,
  ].join(',')).join('\n')

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings-${agencySlug}.csv"`,
    },
  })
}
