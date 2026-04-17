import { chromium, type FullConfig } from '@playwright/test'
import { TEST_USER } from './fixtures'

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const storageState = 'e2e/.auth/user.json'

  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  await page.getByRole('button', { name: /accedi|login|entra/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  await page.context().storageState({ path: storageState })
  await browser.close()
}
