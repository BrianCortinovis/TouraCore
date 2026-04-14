import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applySecurityHeaders,
  checkRateLimit,
  classifyRoute,
  generateCsrfToken,
  getCsrfCookieName,
  getRateLimitConfig,
  getRateLimitKey,
  setRateLimitHeaders,
} from '@touracore/security'

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/superadmin-login' ||
    pathname.startsWith('/superadmin-login/') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/signout') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/portali/') ||
    pathname.startsWith('/property/') ||
    pathname.startsWith('/widget/') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/v1') ||
    pathname.startsWith('/partner/')
  )
}

function isDashboardRedirect(pathname: string): string | null {
  if (pathname === '/dashboard') return '/'
  if (pathname.startsWith('/dashboard/')) return '/'
  return null
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/register')
  )
}


function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/.test(pathname)
  )
}

const ZOMBIE_COOKIES = [
  'touracore_selected_property',
  'touracore_active_property_id',
]

function cleanZombieCookies(request: NextRequest, response: NextResponse): void {
  for (const name of ZOMBIE_COOKIES) {
    if (request.cookies.has(name)) {
      response.cookies.delete(name)
    }
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isStaticAsset(pathname)) {
    return NextResponse.next({ request })
  }

  // Intercetta ?code= di conferma email Supabase su qualsiasi route e inoltra a /auth/callback
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const tier = classifyRoute(pathname)
  const rateLimitKey = getRateLimitKey(tier, ip)
  const rateLimitConfig = getRateLimitConfig(tier)
  const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitConfig)

  if (!rateLimitResult.allowed) {
    const blockedResponse = new NextResponse('Too Many Requests', { status: 429 })
    setRateLimitHeaders(blockedResponse.headers, rateLimitResult)
    applySecurityHeaders(blockedResponse.headers, {
      isDev: process.env.NODE_ENV === 'development',
    })
    return blockedResponse
  }

  // Redirect /dashboard → /account/overview
  const dashboardRedirect = isDashboardRedirect(pathname)
  if (dashboardRedirect) {
    const url = request.nextUrl.clone()
    url.pathname = dashboardRedirect
    const redirectResponse = NextResponse.redirect(url)
    applySecurityHeaders(redirectResponse.headers, {
      isDev: process.env.NODE_ENV === 'development',
    })
    return redirectResponse
  }

  // Route pubbliche non richiedono sessione
  if (isPublicRoute(pathname) && !isAuthRoute(pathname)) {
    const response = NextResponse.next({ request })
    setRateLimitHeaders(response.headers, rateLimitResult)
    applySecurityHeaders(response.headers, {
      isDev: process.env.NODE_ENV === 'development',
      isWidgetRoute: pathname.startsWith('/book/') || pathname.startsWith('/widget/'),
    })
    ensureCsrfCookie(request, response)
    cleanZombieCookies(request, response)
    return response
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rate limiting per utente autenticato: re-check con user ID
  if (user && tier === 'authenticated') {
    const userKey = getRateLimitKey(tier, ip, user.id)
    const userResult = checkRateLimit(userKey, rateLimitConfig)
    if (!userResult.allowed) {
      const blockedResponse = new NextResponse('Too Many Requests', { status: 429 })
      setRateLimitHeaders(blockedResponse.headers, userResult)
      applySecurityHeaders(blockedResponse.headers, {
        isDev: process.env.NODE_ENV === 'development',
      })
      return blockedResponse
    }
    setRateLimitHeaders(supabaseResponse.headers, userResult)
  } else {
    setRateLimitHeaders(supabaseResponse.headers, rateLimitResult)
  }

  applySecurityHeaders(supabaseResponse.headers, {
    isDev: process.env.NODE_ENV === 'development',
  })
  ensureCsrfCookie(request, supabaseResponse)
  cleanZombieCookies(request, supabaseResponse)

  if (!user && !isAuthRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(url)
    applySecurityHeaders(redirect.headers, {
      isDev: process.env.NODE_ENV === 'development',
    })
    return redirect
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirect = NextResponse.redirect(url)
    applySecurityHeaders(redirect.headers, {
      isDev: process.env.NODE_ENV === 'development',
    })
    return redirect
  }

  return supabaseResponse
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  const cookieName = getCsrfCookieName()
  const existing = request.cookies.get(cookieName)
  if (!existing) {
    const token = generateCsrfToken()
    response.cookies.set(cookieName, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
  }
}
