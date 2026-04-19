import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: inv } = await supabase
    .from('agency_client_invitations')
    .select('agency_id, email, tenant_name, vertical_hint, accepted_at, revoked_at, expires_at, agencies(name)')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (inv.revoked_at) return NextResponse.json({ error: 'revoked' }, { status: 410 })
  if (inv.accepted_at) return NextResponse.json({ error: 'already_accepted' }, { status: 410 })
  if (new Date(inv.expires_at as unknown as string) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const agencyRel = (inv as unknown as { agencies?: unknown }).agencies
  const agencyName = Array.isArray(agencyRel)
    ? (agencyRel[0] as { name?: string } | undefined)?.name
    : (agencyRel as { name?: string } | null)?.name

  return NextResponse.json({
    agencyName: agencyName ?? null,
    email: inv.email,
    tenantName: inv.tenant_name,
    verticalHint: inv.vertical_hint,
  })
}
