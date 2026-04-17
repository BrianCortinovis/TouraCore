import { test, expect, TENANT_SLUG } from './fixtures'

test.describe('Settings Billing', () => {
  test('renders plan summary and module breakdown', async ({ authedPage }) => {
    await authedPage.goto(`/${TENANT_SLUG}/settings/billing`)

    await expect(authedPage.getByRole('heading', { name: /fatturazione/i })).toBeVisible()
    await expect(authedPage.getByRole('heading', { name: /piano attuale/i })).toBeVisible()
    await expect(authedPage.getByRole('heading', { name: /^moduli attivi$/i })).toBeVisible()

    // Hospitality €29/mese must appear (può comparire in piano+line item → usa first)
    await expect(authedPage.getByText(/struttura ricettiva/i)).toBeVisible()
    await expect(authedPage.getByText(/€29\.00\/mese/i).first()).toBeVisible()

    // Restaurant free override badge
    await expect(authedPage.getByText(/ristorazione/i)).toBeVisible()
    await expect(authedPage.getByText(/gratis \(override\)/i)).toBeVisible()

    // Commission section
    await expect(authedPage.getByText(/commissioni in sospeso/i)).toBeVisible()
    await expect(authedPage.getByText(/commissioni saldate/i)).toBeVisible()
  })
})
