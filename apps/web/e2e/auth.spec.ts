import { test, expect } from './fixtures'

test.describe('Auth', () => {
  // Questi test usano storageState autenticato. Per testare /login,
  // creiamo context fresco senza storageState.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/TouraCore/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('register page renders', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveTitle(/TouraCore/)
  })
})
