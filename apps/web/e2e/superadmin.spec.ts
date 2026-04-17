import { test, expect } from './fixtures'

test.describe('Super-admin billing', () => {
  test('catalog page shows 7 modules', async ({ authedPage }) => {
    await authedPage.goto('/superadmin/billing/catalog')
    await expect(authedPage.getByRole('heading', { name: /module catalog/i })).toBeVisible()

    for (const label of [
      'Struttura ricettiva',
      'Ristorazione',
      'Wellness/SPA',
      'Esperienze/Tour',
      'Bike/E-bike',
      'Moto',
      'Scuola sci',
    ]) {
      await expect(authedPage.getByText(label, { exact: true })).toBeVisible()
    }

    // Bundle discounts section
    await expect(authedPage.getByText(/bundle discounts/i)).toBeVisible()
    await expect(authedPage.getByText(/da 2 moduli/i)).toBeVisible()
  })

  test('overrides page shows demo free override', async ({ authedPage }) => {
    await authedPage.goto('/superadmin/billing/overrides')
    await expect(authedPage.getByRole('heading', { name: /override moduli/i })).toBeVisible()

    // Deve esistere almeno 1 override attivo (demo seed restaurant)
    await expect(authedPage.getByText(/villa irabo/i).first()).toBeVisible()
    await expect(authedPage.getByText(/Ristorazione/).first()).toBeVisible()
    await expect(authedPage.getByText(/Free/).first()).toBeVisible()
  })

  test('tenant billing detail page loads', async ({ authedPage }) => {
    await authedPage.goto('/superadmin/billing/overrides')
    const link = authedPage.getByRole('link', { name: /gestisci/i }).first()
    await link.click()
    await authedPage.waitForURL(/\/superadmin\/billing\/tenants\/[0-9a-f-]+/, { timeout: 10_000 })
    await expect(authedPage.getByText(/moduli e override/i)).toBeVisible()

    // Deve mostrare bottoni "Concedi gratis" per moduli senza override
    await expect(authedPage.getByRole('button', { name: /concedi gratis/i }).first()).toBeVisible()
  })
})
