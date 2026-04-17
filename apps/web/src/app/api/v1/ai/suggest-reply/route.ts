import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SuggestRequest {
  reviewBody: string
  rating?: number
  propertyName: string
  language?: string
  tone?: 'apology' | 'solution' | 'appreciation'
}

async function generateWithAnthropic(input: SuggestRequest): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = `You are a hotel reputation manager. Generate 3 reply variants to this guest review.
Property: ${input.propertyName}
Language: ${input.language ?? 'it'}
Tone preference: ${input.tone ?? 'balanced'}
Rating: ${input.rating ?? 'unknown'}/10
Review: "${input.reviewBody}"

Return JSON array of 3 strings, each reply professional, empathetic, under 120 words, addressing specific points when possible. No markdown.`

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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: Array<{ text?: string }> }
    const responseText = data.content?.[0]?.text
    if (!responseText) return null
    const parsed = JSON.parse(responseText) as string[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function fallbackReplies(input: SuggestRequest): string[] {
  const name = input.propertyName
  if ((input.rating ?? 0) >= 7) {
    return [
      `Grazie di cuore per la sua recensione! Siamo felici di sapere che il suo soggiorno a ${name} e stato all'altezza delle aspettative. La aspettiamo per una prossima visita.`,
      `Gentile ospite, il suo feedback positivo e un riconoscimento prezioso per tutto il team di ${name}. Grazie per aver scelto la nostra struttura.`,
      `Siamo entusiasti della sua recensione! Il team di ${name} lavora ogni giorno per garantire esperienze memorabili e feedback come il suo ci motivano a continuare su questa strada.`,
    ]
  }
  return [
    `Gentile ospite, ci dispiace molto per l'esperienza vissuta. Il suo feedback e essenziale per migliorare. La invitiamo a contattarci direttamente per approfondire e trovare una soluzione.`,
    `Grazie per la sua sincerita. A ${name} prendiamo molto seriamente ogni segnalazione: abbiamo gia avviato verifiche interne per evitare che cio si ripeta.`,
    `Ci scusiamo per i disagi. Il suo feedback e stato condiviso con il team e ci impegniamo a risolvere i punti critici. Restiamo a disposizione per qualsiasi chiarimento.`,
  ]
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SuggestRequest
  if (!body.reviewBody || !body.propertyName) {
    return NextResponse.json({ error: 'reviewBody and propertyName required' }, { status: 400 })
  }
  const suggestions = (await generateWithAnthropic(body)) ?? fallbackReplies(body)
  return NextResponse.json({ ok: true, suggestions })
}
