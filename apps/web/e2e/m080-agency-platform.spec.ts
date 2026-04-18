import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'https://touracore.vercel.app'

test.describe('M080 agency+platform live verify', () => {
  test('anon routes redirect to login', async ({ page }) => {
    const urls = ['/platform', '/a/demo-travel', '/a/alpine-tours', '/agency-onboarding']
    for (const u of urls) {
      const res = await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' })
      expect(res?.status()).toBeLessThan(500)
      expect(page.url()).toMatch(/login|auth/)
    }
  })

  test('platform admin login sees /platform 200', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]', 'briansnow86@gmail.com')
    await page.fill('input[type=password]', 'PlatformAdmin2026!')
    await page.click('button[type=submit]')
    await page.waitForURL(/\/(platform|\w)/, { timeout: 15000 })
    await page.goto(`${BASE}/platform`)
    await expect(page.locator('h1')).toContainText('Control Room')
  })

  test('platform admin sees agencies list', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]', 'briansnow86@gmail.com')
    await page.fill('input[type=password]', 'PlatformAdmin2026!')
    await page.click('button[type=submit]')
    await page.waitForLoadState('networkidle')
    await page.goto(`${BASE}/platform/agencies`)
    await expect(page.locator('table')).toBeVisible()
  })

  test('agency owner sees own /a/slug', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]', 'owner-alpine@touracore.test')
    await page.fill('input[type=password]', 'OwnerTest2026!')
    await page.click('button[type=submit]')
    await page.waitForLoadState('networkidle')
    await page.goto(`${BASE}/a/alpine-tours`)
    await expect(page.locator('h1')).toContainText('Alpine Tours')
  })

  test('agency owner cannot access other agency', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]', 'owner-alpine@touracore.test')
    await page.fill('input[type=password]', 'OwnerTest2026!')
    await page.click('button[type=submit]')
    await page.waitForLoadState('networkidle')
    const res = await page.goto(`${BASE}/a/riviera-travel`)
    // Deve redirect a / o 403
    expect(page.url()).not.toContain('/a/riviera-travel')
  })
})
