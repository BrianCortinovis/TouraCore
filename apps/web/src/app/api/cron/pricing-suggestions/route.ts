import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import { generateSuggestionsForEntity } from '@/lib/pricing-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (req.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(req)
}

/**
 * Cron daily 4AM: regenera pricing suggestions per ogni entity hospitality.
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceRoleClient()
  const { data: entities } = await admin
    .from('entities')
    .select('id')
    .eq('kind', 'accommodation')
    .eq('is_active', true)

  let total = 0
  for (const e of entities ?? []) {
    try {
      const count = await generateSuggestionsForEntity(e.id as string, 30)
      total += count
    } catch (err) {
      console.error(`[pricing] entity ${e.id} failed`, err)
    }
  }

  return NextResponse.json({ ok: true, entities: entities?.length ?? 0, suggestions: total })
}
