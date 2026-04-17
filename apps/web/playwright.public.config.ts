import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /public-.*\.spec\.ts/,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['list']],
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_PUBLIC_URL ?? 'https://touracore.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
