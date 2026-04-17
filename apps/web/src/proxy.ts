import { type NextRequest, type NextResponse } from 'next/server'
import { updateSession } from '@touracore/auth/middleware'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  return updateSession(request as unknown as Parameters<typeof updateSession>[0]) as unknown as Promise<NextResponse>
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
