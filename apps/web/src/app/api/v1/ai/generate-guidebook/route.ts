import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface GenerateRequest {
  guidebookId: string
  city: string
  country?: string
  language?: string
  latitude?: number
  longitude?: number
}

interface GeneratedPoi {
  category: string
  name: string
  description: string
  address?: string
  url?: string
}

async function generateWithAnthropic(input: GenerateRequest): Promise<GeneratedPoi[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = `Generate a guidebook with 15 POI for guests staying in ${input.city}${input.country ? ', ' + input.country : ''}.
Include: 4 restaurants, 3 attractions, 2 nightlife spots, 2 shopping, 2 transport tips, 2 local tips.
Language: ${input.language ?? 'it'}.
Return JSON array of objects with fields: category (restaurant|attraction|nightlife|shopping|transport|beach|museum|activity|tip|other), name, description (2 short sentences), address (optional), url (optional).
No markdown, valid JSON only.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: Array<{ text?: string }> }
    const text = data.content?.[0]?.text
    if (!text) return null
    return JSON.parse(text) as GeneratedPoi[]
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GenerateRequest
  if (!body.guidebookId || !body.city) {
    return NextResponse.json({ error: 'guidebookId and city required' }, { status: 400 })
  }

  const pois = await generateWithAnthropic(body)
  if (!pois || pois.length === 0) {
    return NextResponse.json({ error: 'AI generation not available (configure ANTHROPIC_API_KEY)' }, { status: 503 })
  }

  const supabase = await createServiceRoleClient()
  const rows = pois.map((p, idx) => ({
    guidebook_id: body.guidebookId,
    category: p.category,
    name: p.name,
    description: p.description,
    address: p.address,
    url: p.url,
    sort_order: idx,
  }))
  const { error } = await supabase.from('guidebook_items').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('guidebooks')
    .update({ generated_by: 'ai', generated_at: new Date().toISOString() })
    .eq('id', body.guidebookId)

  return NextResponse.json({ ok: true, poi_count: rows.length })
}
