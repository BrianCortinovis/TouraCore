import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  tags: z.array(z.string().min(1).max(200)).max(50).optional(),
  paths: z.array(z.string().min(1).max(500)).max(50).optional(),
})

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('x-revalidate-secret') ?? req.headers.get('x-cron-secret')
  return header === secret
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 })
  }

  const tags = parsed.data.tags ?? []
  const paths = parsed.data.paths ?? []

  for (const tag of tags) revalidateTag(tag, 'default')
  for (const path of paths) revalidatePath(path)

  return NextResponse.json({ ok: true, revalidated: { tags, paths } })
}
