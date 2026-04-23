import { test } from '@playwright/test'

const TENANT = 'villa-irabo'

type R = { entity: string; expected: string; got: string | null; result: 'OK' | 'FAIL' }
const results: R[] = []

test.describe.configure({ mode: 'serial' })
test.afterAll(() => {
  console.log('\n====== SCOPE CROSS-ENTITY AUDIT ======')
  results.forEach(r => console.log(`[${r.result}] creato su ${r.entity} → DB: ${r.got ?? 'missing'} (atteso ${r.expected})`))
  console.log(`\nScope corretto: ${results.filter(r => r.result === 'OK').length}/${results.length}`)
  console.log('======================================\n')
})

async function createSeasonOn(page: any, tenantSlug: string, entitySlug: string, seasonName: string) {
  await page.goto(`/${tenantSlug}/stays/${entitySlug}/seasons`, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: /Nuova stagione/i }).first().click()
  await page.waitForTimeout(600)
  const modal = page.locator('div.fixed.inset-0.z-50').first()
  if (!await modal.isVisible().catch(() => false)) return false
  const nameInput = modal.locator('input[type="text"], input:not([type])').first()
  await nameInput.fill(seasonName)
  const dates = modal.locator('input[type="date"]')
  if (await dates.count() >= 2) {
    await dates.nth(0).fill('2026-07-01')
    await dates.nth(1).fill('2026-08-31')
  }
  const save = modal.getByRole('button', { name: /Salva|Crea|Aggiungi/i }).first()
  await save.click()
  await page.waitForTimeout(3000)
  return true
}

const ENTITIES = ['villa-irabo', 'grand-hotel-adriatico', 'bnb-il-glicine']

for (const entity of ENTITIES) {
  test(`SCOPE: create season on ${entity}`, async ({ page, request }) => {
    const name = `SCOPETEST_${entity.slice(0, 8)}_${Date.now().toString().slice(-6)}`
    const ok = await createSeasonOn(page, TENANT, entity, name)
    if (!ok) { results.push({ entity, expected: entity, got: null, result: 'FAIL' }); return }

    // Verify via public API? No. Use supabase service via test helper: leverage fetch through a debug endpoint — skip. Use DB check external.
    // Instead: load seasons page on same entity and check record appears there
    await page.goto(`/${TENANT}/stays/${entity}/seasons`, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const body = await page.locator('main, body').first().innerText()
    const appearsHere = body.includes(name)

    // Cross-check: load seasons on OTHER entity and ensure NOT present
    const otherEntity = ENTITIES.find(e => e !== entity)!
    await page.goto(`/${TENANT}/stays/${otherEntity}/seasons`, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const otherBody = await page.locator('main, body').first().innerText()
    const appearsElsewhere = otherBody.includes(name)

    results.push({
      entity,
      expected: entity,
      got: appearsHere && !appearsElsewhere ? entity : (appearsElsewhere ? otherEntity : null),
      result: (appearsHere && !appearsElsewhere) ? 'OK' : 'FAIL',
    })
  })
}
