import { test, expect } from '@playwright/test'

/**
 * E2E frontend pubblico — nessuna auth richiesta.
 * Simula cliente finale che prenota sul booking engine pubblico.
 */

const BASE_URL = process.env.E2E_PUBLIC_URL ?? 'https://touracore.vercel.app'
const TENANT = 'villa-irabo'

test.describe('Frontend pubblico — no auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('booking unificato landing page renderizza', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    expect(res?.status(), 'HTTP 200').toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText(/prenota|book/i).first()).toBeVisible()
  })

  test('tab multi-vertical presenti per tenant multi-modulo', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    const tabDormire = page.getByRole('button', { name: /dormire/i })
    const tabMangiare = page.getByRole('button', { name: /mangiare/i })
    await expect(tabDormire).toBeVisible({ timeout: 10_000 })
    await expect(tabMangiare).toBeVisible()
  })

  test('cart inizia vuoto', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    await expect(page.getByText(/carrello.*0|cart.*empty|vuoto/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('switch tab Mangiare mostra form ristorante', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    await page.getByRole('button', { name: /mangiare/i }).click()
    await expect(page.getByText(/prenota tavolo|coperti|table/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('add ristorante al carrello (gratuito)', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    await page.getByRole('button', { name: /mangiare/i }).click()

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dateInput = page.locator('input[type="date"]').first()
    await dateInput.fill(tomorrow)

    const addBtn = page.getByRole('button', { name: /prenota tavolo|aggiungi|add/i }).first()
    await addBtn.click()

    await expect(page.getByText(/carrello \(1\)|cart \(1\)/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('hospitality booking engine legacy /book/[slug] risponde', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/book/${TENANT}`)
    // Qualsiasi 2xx/3xx accettabile; 404 invece è problema
    expect([200, 301, 302, 307, 308], `status=${res?.status()}`).toContain(res?.status() ?? 0)
  })

  test('restaurant booking engine /book-table/[slug] risponde', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/book-table/trattoria-del-borgo`)
    expect([200, 301, 302, 307, 308, 404], `status=${res?.status()}`).toContain(res?.status() ?? 0)
  })

  test('no flash unauthenticated redirect (pubblico)', async ({ page }) => {
    const loginRedirects: string[] = []
    page.on('framenavigated', (frame) => {
      const url = frame.url()
      if (url.includes('/login')) loginRedirects.push(url)
    })
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    await page.waitForLoadState('networkidle')
    expect(loginRedirects, 'no redirect a /login per rotta pubblica').toEqual([])
  })

  test('privacy consent è obbligatorio per procedere', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/multi/${TENANT}`)
    // Aggiungi item ristorante veloce
    await page.getByRole('button', { name: /mangiare/i }).click()
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').first().fill(tomorrow)
    await page.getByRole('button', { name: /prenota tavolo|aggiungi/i }).first().click()

    // Vai a checkout
    await page.getByRole('button', { name: /procedi|checkout/i }).click()

    // Form guest: compila senza consenso
    await page.getByLabel(/nome/i).fill('Mario Test')
    await page.getByLabel(/^email/i).fill('test@example.com')

    // Button "Continua" dovrebbe essere disabled senza consent
    const continueBtn = page.getByRole('button', { name: /continua|next/i })
    await expect(continueBtn).toBeDisabled()

    // Spunta consenso → abilitato
    await page.getByLabel(/informativa privacy|privacy/i).check()
    await expect(continueBtn).toBeEnabled()
  })

  test('landing home pubblica (se esiste) risponde', async ({ page }) => {
    const res = await page.goto(BASE_URL)
    expect([200, 301, 302, 307, 308], `status=${res?.status()}`).toContain(res?.status() ?? 0)
  })
})
