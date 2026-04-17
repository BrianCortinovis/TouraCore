import { test, expect } from './fixtures'

// Queste pagine richiedono auth ma si aspettano che l'utente abbia già tenant setup.
// Test statico: verifica redirect corretto per utente completo.

test.describe('Onboarding routes (authed complete user)', () => {
  test('/onboarding redirects to tenant dashboard when setup complete', async ({ authedPage }) => {
    await authedPage.goto('/onboarding')
    // Per user con tenant+legal+modules+entity tutto ok → redirect a /{slug}
    await authedPage.waitForURL(/\/villa-irabo/, { timeout: 10_000 })
  })

  test('step-modules page loads for authed user', async ({ authedPage }) => {
    // Forza visita anche se redirect — controlla che page renderizzi senza crash
    const res = await authedPage.request.get('/onboarding/step-modules', {
      maxRedirects: 0,
    }).catch(() => null)
    expect(res?.status()).toBeLessThan(500)
  })

  test('step-plan page loads for authed user', async ({ authedPage }) => {
    const res = await authedPage.request.get('/onboarding/step-plan', {
      maxRedirects: 0,
    }).catch(() => null)
    expect(res?.status()).toBeLessThan(500)
  })
})
