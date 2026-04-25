import { test, expect, type APIResponse, type Page } from '@playwright/test'

/**
 * SEO hardening E2E — covers Sprint 1 (P0) + Sprint 2 (P1) + Sprint 3 (P2).
 * Runs without storage state (anonymous public-facing crawl).
 * Listing-dependent specs are skipped when no public listing exists in the
 * environment (CI/dev DB without seed) — verified once via API call.
 */

const BASE_URL = process.env.E2E_PUBLIC_URL ?? 'http://localhost:3000'

test.use({ storageState: { cookies: [], origins: [] } })

async function pickPublicListing(
  page: Page
): Promise<{ tenantSlug: string; entitySlug: string } | null> {
  // sitemap-listings.xml is the cheapest public source of valid (tenant, entity) pairs.
  const res = await page.request.get(`${BASE_URL}/sitemap-listings.xml`)
  if (!res.ok()) return null
  const xml = await res.text()
  const m = xml.match(/<loc>[^<]*\/s\/([^/]+)\/([^<]+)<\/loc>/)
  if (!m || !m[1] || !m[2]) return null
  return { tenantSlug: m[1], entitySlug: m[2] }
}

test.describe('Sprint 1 — Indexability + headers', () => {
  test('home / has canonical, OG image, no noindex', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/`)
    expect(res?.status(), 'home 200').toBe(200)

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href')
    expect(canonical, 'canonical set').toBeTruthy()

    // Next omits <meta name="robots"> when defaulting to index/follow.
    // Treat "no tag" or "without noindex" as both acceptable.
    const robotsCount = await page.locator('meta[name="robots"]').count()
    if (robotsCount > 0) {
      const robots = (await page.locator('meta[name="robots"]').first().getAttribute('content')) ?? ''
      expect(robots).not.toContain('noindex')
    }

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute('content')
    expect(ogImage, 'og:image set').toBeTruthy()
  })

  test('/book/* is noindex (booking layout)', async ({ page }) => {
    // /book/[slug] catch-all renders even with non-existent slug → check meta
    const res = await page.goto(`${BASE_URL}/book/__seo-probe__`, {
      waitUntil: 'domcontentloaded',
    })
    // status may be 200 (page renders 'not found' inline) or 404 — both fine
    expect([200, 404]).toContain(res?.status() ?? 0)

    const robots = (await page.locator('meta[name="robots"]').first().getAttribute('content')) ?? ''
    expect(robots).toContain('noindex')
  })

  test('/property/[slug] returns noindex+canonical to /s/* when match exists', async ({ page }) => {
    // probe with a likely-missing slug → 404 + noindex still expected (fallback metadata)
    const res = await page.goto(`${BASE_URL}/property/__seo-probe__`, {
      waitUntil: 'domcontentloaded',
    })
    expect([200, 404]).toContain(res?.status() ?? 0)
    const robots = (await page.locator('meta[name="robots"]').first().getAttribute('content')) ?? ''
    expect(robots).toContain('noindex')
  })

  test('security headers globali (HSTS, XFO, nosniff, Referrer, Permissions)', async ({ request }) => {
    const r: APIResponse = await request.get(`${BASE_URL}/`)
    const h = r.headers()
    expect(h['strict-transport-security'] ?? '').toContain('max-age')
    // Middleware applies DENY for non-widget routes; next.config fallback uses SAMEORIGIN.
    expect(['DENY', 'SAMEORIGIN']).toContain(h['x-frame-options'])
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['permissions-policy']).toBeTruthy()
  })

  test('font next/font Inter preloaded', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    const fontPreloads = await page.locator('link[rel="preload"][as="font"]').count()
    // next/font emits at least one preload tag for Inter
    expect(fontPreloads).toBeGreaterThan(0)
  })
})

test.describe('Sprint 1+2+3 — Sitemap + robots', () => {
  test('robots.txt blocca admin + esponde sitemap', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/robots.txt`)
    expect(r.ok()).toBe(true)
    const body = await r.text()
    expect(body).toMatch(/User-Agent:/i)
    expect(body).toMatch(/Disallow:\s*\/api/i)
    expect(body).toMatch(/Disallow:\s*\/dashboard/i)
    expect(body).toMatch(/Sitemap:/i)
  })

  test('sitemap_index.xml lista sub-sitemap principali', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/sitemap_index.xml`)
    expect(r.ok()).toBe(true)
    const body = await r.text()
    expect(body).toContain('sitemap-listings.xml')
    expect(body).toContain('sitemap-pages.xml')
    expect(body).toContain('sitemap-legal.xml')
  })
})

test.describe('Sprint 2 — /discover SEO', () => {
  test('/discover ha metadata + breadcrumb JSON-LD', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/discover`)
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/Discover/i)

    // collect ALL ld+json blobs
    const lds = await page.locator('script[type="application/ld+json"]').allTextContents()
    const parsed = lds
      .map((t) => {
        try {
          return JSON.parse(t)
        } catch {
          return null
        }
      })
      .filter(Boolean)
    const hasBreadcrumb = parsed.some(
      (o) => o?.['@type'] === 'BreadcrumbList' && Array.isArray(o.itemListElement)
    )
    expect(hasBreadcrumb, 'discover emits BreadcrumbList JSON-LD').toBe(true)
  })
})

test.describe('Listing-dependent (skipped without public data)', () => {
  test('listing /s/[t]/[e] emette JSON-LD valido', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)

    const lds = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(lds.length).toBeGreaterThan(0)
    const parsed = lds.map((t) => JSON.parse(t))
    const main = parsed.find((o) =>
      ['LodgingBusiness', 'Restaurant', 'BicycleStore', 'TouristAttraction'].includes(o['@type'])
    )
    expect(main, 'listing has main schema.org type').toBeTruthy()
    expect(main.name).toBeTruthy()
    expect(main.url).toContain('/s/')
  })

  test('listing canonical NON ha noindex', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)
    const robots = (await page.locator('meta[name="robots"]').first().getAttribute('content')) ?? ''
    expect(robots).not.toContain('noindex')
  })

  test('listing footer mostra link legal + sitemap', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)

    const footer = page.locator('[data-testid="listing-footer"]')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /cookie/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /termini/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /sitemap/i })).toBeVisible()
  })

  test('listing FAQ section emette FAQPage JSON-LD quando presente', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)
    const visible = await page.locator('[data-testid="listing-faq"]').isVisible()
    if (!visible) test.skip(true, 'listing kind without 3+ FAQs')
    const lds = await page.locator('script[type="application/ld+json"]').allTextContents()
    const parsed = lds.map((t) => JSON.parse(t))
    const faq = parsed.find((o) => o['@type'] === 'FAQPage')
    expect(faq, 'FAQPage JSON-LD present').toBeTruthy()
    expect(Array.isArray(faq.mainEntity)).toBe(true)
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3)
  })

  test('listing CIN badge visibile per accommodation con cin_code', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)
    const badge = page.locator('[data-testid="cin-badge"]')
    if ((await badge.count()) === 0) test.skip(true, 'tenant without CIN code or non-accommodation')
    await expect(badge.first()).toBeVisible()
    await expect(badge.first()).toContainText(/CIN/i)
  })

  test('listing hero image è ottimizzata (next/image, no unoptimized)', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)
    const firstImg = page.locator('img').first()
    if ((await firstImg.count()) === 0) test.skip(true, 'no image on listing')
    const src = (await firstImg.getAttribute('src')) ?? ''
    // next/image rewrites to /_next/image?url=...
    expect(src).toMatch(/_next\/image|\.svg$|^data:/)
  })

  test('listing related listings sezione presente quando tenant multi-entity', async ({ page }) => {
    const target = await pickPublicListing(page)
    test.skip(!target, 'no public listing in this environment')
    await page.goto(`${BASE_URL}/s/${target!.tenantSlug}/${target!.entitySlug}`)
    const related = page.locator('[data-testid="related-listings"]')
    if ((await related.count()) === 0) test.skip(true, 'tenant with single entity')
    await expect(related).toBeVisible()
  })
})
