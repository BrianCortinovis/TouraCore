import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@touracore/auth'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

const AnalyzeSchema = z.object({
  reviewId: z.string().uuid().optional(),
  text: z.string().min(1).max(10_000),
  language: z.string().max(10).optional(),
})

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number
  topics: string[]
}

async function analyzeWithAnthropic(text: string, language: string): Promise<SentimentResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = `Analyze this hotel review (language: ${language}). Return JSON with:
- sentiment: "positive" | "neutral" | "negative"
- score: number 0-1
- topics: array of relevant topics (cleanliness, staff, location, value, amenities, food, comfort, noise)

Review: "${text}"

Return only valid JSON, no markdown.`

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: Array<{ text?: string }> }
    const responseText = data.content?.[0]?.text
    if (!responseText) return null
    return JSON.parse(responseText) as SentimentResult
  } catch {
    return null
  }
}

function heuristicFallback(text: string): SentimentResult {
  const lc = text.toLowerCase()
  const negative = /(sporc|disgust|bad|terrible|rumoros|freddo|rude|scortes|broken|rotto|dirty)/.test(lc)
  const positive = /(ottim|eccellen|wonderful|perfect|amazing|fantastic|pulit|cortes|gentil|clean|great|love)/.test(lc)
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  let score = 0.5
  if (negative && !positive) { sentiment = 'negative'; score = 0.2 }
  else if (positive && !negative) { sentiment = 'positive'; score = 0.85 }
  return { sentiment, score, topics: [] }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = AnalyzeSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }
  const body = parsed.data

  const result = (await analyzeWithAnthropic(body.text, body.language ?? 'it')) ?? heuristicFallback(body.text)

  if (body.reviewId) {
    const userClient = await createServerSupabaseClient()
    const { data: review } = await userClient
      .from('reviews')
      .select('id, tenant_id')
      .eq('id', body.reviewId)
      .maybeSingle()
    if (!review) {
      return NextResponse.json({ error: 'Review not found or forbidden' }, { status: 404 })
    }
    const supabase = await createServiceRoleClient()
    await supabase
      .from('reviews')
      .update({
        sentiment: result.sentiment,
        sentiment_score: result.score,
        topics: result.topics,
      })
      .eq('id', review.id)
      .eq('tenant_id', review.tenant_id)
  }

  return NextResponse.json({ ok: true, ...result })
}
