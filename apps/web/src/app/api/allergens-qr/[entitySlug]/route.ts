import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { buildAllergensInfoSvg } from '@/lib/allergens-qr'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entitySlug: string }> }
) {
  const { entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, slug')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: items } = await supabase
    .from('menu_items')
    .select('allergens')
    .eq('restaurant_id', entity.id)
    .eq('active', true)

  const allergens = new Set<string>()
  for (const it of items ?? []) {
    for (const a of (it.allergens as string[]) ?? []) allergens.add(a)
  }

  const svg = buildAllergensInfoSvg(
    entity.name as string,
    entity.slug as string,
    Array.from(allergens),
    'it'
  )

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="allergeni-${entitySlug}.svg"`,
      'Cache-Control': 'no-store',
    },
  })
}
