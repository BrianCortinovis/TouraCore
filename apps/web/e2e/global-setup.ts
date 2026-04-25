import { chromium, type FullConfig } from '@playwright/test'
import { TEST_USER } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    'http://localhost:3000'
  const storageState = 'e2e/.auth/user.json'

  // Skip auth setup for public-only suites (anonymous flows). Honored by
  // tests that call test.use({ storageState: { cookies: [], origins: [] } }).
  if (process.env.E2E_SKIP_AUTH === '1') {
    fs.mkdirSync(path.dirname(storageState), { recursive: true })
    fs.writeFileSync(storageState, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

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
