import { test as base, expect, type Page } from '@playwright/test'

export const TEST_USER = {
  email: 'briansnow86@gmail.com',
  password: process.env.E2E_PASSWORD ?? 'E2eTest2026!',
}

export const TENANT_SLUG = 'villa-irabo'

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await use(page)
  },
})

export { expect }
