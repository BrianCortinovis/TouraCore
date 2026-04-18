import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

const VALID_PLANS = ['agency_starter', 'agency_pro', 'agency_enterprise'] as const
type Plan = typeof VALID_PLANS[number]

const PLAN_MAX: Record<Plan, number> = { agency_starter: 3, agency_pro: 10, agency_enterprise: 999 }

export async function POST(req: Request, ctxReq: { params: Promise<{ agencySlug: string }> }) {
  const { agencySlug } = await ctxReq.params
  const ctx = await getVisibilityContext()
  if (!ctx.user) return NextResponse.redirect(new URL('/login', req.url))
  if (!hasPermission(ctx, 'billing.write')) {
    await logAgencyAction({
      action: 'billing.permission_denied',
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.agencyRole ?? 'tenant',
      agencyId: ctx.agencyId,
      status: 'denied',
      metadata: { attempted: 'change_plan' },
    })
    return NextResponse.redirect(new URL(`/a/${agencySlug}/billing?error=forbidden`, req.url))
  }

  const form = await req.formData()
  const plan = form.get('plan') as Plan | null
  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.redirect(new URL(`/a/${agencySlug}/billing?error=invalid_plan`, req.url))
  }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id, plan').eq('slug', agencySlug).maybeSingle()
  if (!agency) return NextResponse.redirect(new URL('/', req.url))
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) {
    return NextResponse.redirect(new URL(`/a/${agencySlug}/billing?error=forbidden`, req.url))
  }

  const oldPlan = agency.plan
  const { error } = await supabase
    .from('agencies')
    .update({ plan, max_tenants: PLAN_MAX[plan] })
    .eq('id', agency.id)
  if (error) {
    return NextResponse.redirect(new URL(`/a/${agencySlug}/billing?error=${encodeURIComponent(error.message)}`, req.url))
  }

  await logAgencyAction({
    action: 'billing.plan_changed',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole ?? 'agency_owner',
    agencyId: agency.id,
    metadata: { from: oldPlan, to: plan },
  })

  return NextResponse.redirect(new URL(`/a/${agencySlug}/billing?ok=plan_changed`, req.url))
}
