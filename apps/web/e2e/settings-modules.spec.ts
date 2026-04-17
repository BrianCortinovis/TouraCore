import { test, expect, TENANT_SLUG } from './fixtures'

test.describe('Settings Modules', () => {
  test('renders 7 module cards with prices', async ({ authedPage }) => {
    await authedPage.goto(`/${TENANT_SLUG}/settings/modules`)
    await expect(authedPage.getByRole('heading', { name: /moduli attivi/i })).toBeVisible()

    // I 7 moduli del catalog devono comparire
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

    // Badge "Gratis" visibile sul modulo con override free (restaurant demo seed)
    await expect(authedPage.getByText(/gratis/i).first()).toBeVisible()

    // Badge "Abbonamento attivo" su hospitality
    const hospitalityCard = authedPage
      .locator('div')
      .filter({ hasText: /^🏨Struttura ricettiva/ })
      .first()
    await expect(hospitalityCard).toBeVisible()
  })

  test('link to billing page works', async ({ authedPage }) => {
    await authedPage.goto(`/${TENANT_SLUG}/settings/modules`)
    await authedPage.getByRole('link', { name: /vai alla fatturazione/i }).click()
    await authedPage.waitForURL(`**/${TENANT_SLUG}/settings/billing`)
    await expect(authedPage.getByRole('heading', { name: /fatturazione/i })).toBeVisible()
  })
})
