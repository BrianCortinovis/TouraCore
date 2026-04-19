import { test, expect } from './fixtures'

test.describe('M087 Register intent picker (no auth)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('register page renders intent toggle tenant/agency', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /crea il tuo account/i })).toBeVisible()
    const content = await page.content()
    expect(content).toContain('Struttura / Attività')
    expect(content).toContain('Agenzia')
  })

  test('vertical sub-pick shown for tenant intent (default)', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Cosa gestisci?')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('vertical sub-pick hidden when agency selected', async ({ page }) => {
    await page.goto('/register')
    await page.locator('button:has-text("Agenzia")').first().click()
    await expect(page.getByText('Cosa gestisci?')).not.toBeVisible()
  })
})

test.describe('M087 Agency wizard 2-step', () => {
  test('/agency-onboarding accessible when authenticated', async ({ authedPage }) => {
    const res = await authedPage.request.get('/agency-onboarding', { maxRedirects: 0 }).catch(() => null)
    expect(res?.status()).toBeLessThan(500)
  })
})

test.describe('M088 Agency referral landing /r/[slug]', () => {
  test('unknown agency slug returns 404', async ({ page }) => {
    const res = await page.goto('/r/non-esistente-xyz')
    expect(res?.status()).toBe(404)
  })
})

test.describe('M088 Client invite lookup API', () => {
  test('missing token returns 400', async ({ page }) => {
    const res = await page.request.get('/api/agency/client-invite/lookup')
    expect(res.status()).toBe(400)
  })

  test('invalid token returns 404', async ({ page }) => {
    const res = await page.request.get('/api/agency/client-invite/lookup?token=invalid_xyz_123')
    expect(res.status()).toBe(404)
  })

  test('public route (no auth required)', async ({ page }) => {
    const res = await page.request.get('/api/agency/client-invite/lookup?token=test', { maxRedirects: 0 })
    expect([400, 404, 410]).toContain(res.status())
  })
})

test.describe('M089 Step-3 kind-aware wizards', () => {
  const kinds = ['restaurant', 'bike', 'experience', 'wellness', 'moto', 'ski']

  for (const kind of kinds) {
    test(`step-3/${kind} page renders or redirects cleanly`, async ({ authedPage }) => {
      const res = await authedPage.request.get(`/onboarding/step-3/${kind}`, { maxRedirects: 0 }).catch(() => null)
      expect(res?.status()).toBeLessThan(500)
    })
  }

  test('step-3 root router redirects authed user with complete tenant', async ({ authedPage }) => {
    const res = await authedPage.request.get('/onboarding/step-3', { maxRedirects: 0 }).catch(() => null)
    expect([200, 307, 308]).toContain(res?.status() ?? 0)
  })
})

test.describe('M090 Modules hub tenant', () => {
  test('/villa-irabo/settings/modules renders', async ({ authedPage }) => {
    await authedPage.goto('/villa-irabo/settings/modules')
    await expect(authedPage.locator('body')).toBeVisible()
  })

  test('Hospitality module card visible (tenant has it)', async ({ authedPage }) => {
    await authedPage.goto('/villa-irabo/settings/modules')
    await expect(authedPage.getByText(/struttura ricettiva|hospitality/i).first()).toBeVisible()
  })
})

test.describe('M091 Billing snapshots cron', () => {
  test('cron endpoint requires CRON_SECRET', async ({ page }) => {
    const res = await page.request.post('/api/cron/billing-snapshots')
    expect([401, 503]).toContain(res.status())
  })

  test('cron endpoint supports GET method', async ({ page }) => {
    const res = await page.request.get('/api/cron/billing-snapshots')
    expect([401, 503]).toContain(res.status())
  })
})

test.describe('M087 Post-login router', () => {
  test('homepage logged-in redirects away from login', async ({ authedPage }) => {
    await authedPage.goto('/')
    // briansnow86 è super_admin → /superadmin (priority alta su intent/tenant)
    // Altri user → /{tenantSlug} o /agency-onboarding
    await authedPage.waitForURL(
      (url) => !url.pathname.startsWith('/login') && url.pathname !== '/',
      { timeout: 15_000 },
    )
    const url = authedPage.url()
    expect(url).toMatch(/\/(superadmin|villa-irabo|agency-onboarding|onboarding|a\/)/)
  })
})
