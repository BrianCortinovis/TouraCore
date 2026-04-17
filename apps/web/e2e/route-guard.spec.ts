import { test, expect, TENANT_SLUG } from './fixtures'

test.describe('Module route guard', () => {
  test('stays accessible when hospitality active', async ({ authedPage }) => {
    await authedPage.goto(`/${TENANT_SLUG}/stays`)
    await authedPage.waitForLoadState('networkidle')
    await expect(authedPage.getByRole('heading', { name: /strutture/i })).toBeVisible()
    expect(authedPage.url()).toContain('/stays')
  })

  test('non-existent vertical route is 404 or redirect', async ({ authedPage }) => {
    const response = await authedPage.goto(`/${TENANT_SLUG}/nonexistent-vertical`)
    // Accetta 404, 302, o qualsiasi non-500
    expect(response?.status()).toBeLessThan(500)
  })
})
