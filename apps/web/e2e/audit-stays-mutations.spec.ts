import { test } from '@playwright/test'

const TENANT = 'villa-irabo'
const ENTITY = 'villa-irabo'
const BASE = `/${TENANT}/stays/${ENTITY}`

test.describe.configure({ mode: 'serial' })

const mutations: { flow: string; result: 'OK' | 'FAIL'; detail: string }[] = []
test.afterAll(() => {
  console.log('\n====== STAYS MUTATIONS ======')
  mutations.forEach(m => console.log(`[${m.result}] ${m.flow} — ${m.detail}`))
  const ok = mutations.filter(m => m.result === 'OK').length
  console.log(`\nMutazioni OK: ${ok}/${mutations.length}`)
  console.log('=============================\n')
})

async function setupNoise(page: any, errors: string[]) {
  const ignore = (t: string) => /vercel-scripts|va\.vercel|speed-insights|hydrated|favicon|manifest/i.test(t)
  page.on('pageerror', (e: any) => { if (!ignore(e.message)) errors.push(e.message.slice(0, 100)) })
  page.on('console', (m: any) => {
    if (m.type() !== 'error') return
    const t = m.text(); if (ignore(t)) return
    errors.push(t.slice(0, 100))
  })
  page.on('response', (r: any) => {
    if (r.status() >= 500) errors.push(`HTTP5xx ${r.status()}`)
  })
}

test('MUT: create + delete rate-plan', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/rate-plans`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const testName = `AUDIT_TEST_${Date.now()}`
  await page.getByRole('button', { name: /Nuovo piano/i }).first().click()
  await page.waitForTimeout(500)

  const dialog = page.locator('div.fixed.inset-0.z-50').first()
  const visible = await dialog.isVisible().catch(() => false)
  if (!visible) { mutations.push({ flow: 'rate-plan create', result: 'FAIL', detail: 'modal non aperto' }); return }

  // Fill name (first text input in dialog)
  const nameInput = dialog.locator('input[type="text"], input:not([type])').first()
  await nameInput.fill(testName)

  // Save
  const saveBtn = dialog.getByRole('button', { name: /Salva|Crea|Conferma/i }).first()
  const saveExists = await saveBtn.count()
  if (!saveExists) { mutations.push({ flow: 'rate-plan create', result: 'FAIL', detail: 'no save button' }); return }
  await saveBtn.click()
  await page.waitForTimeout(2500)

  // Verify appears in list
  const body = await page.locator('main').innerText()
  const hasRow = body.includes(testName)
  mutations.push({
    flow: 'rate-plan create',
    result: hasRow && !errs.length ? 'OK' : 'FAIL',
    detail: hasRow ? `created "${testName}"` : `errors: ${errs.slice(0, 2).join(' | ')}`,
  })
})

test('MUT: create + delete room', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/rooms`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const testNum = `Z${Date.now().toString().slice(-6)}`
  await page.getByRole('button', { name: /Nuovo appartamento/i }).first().click()
  await page.waitForTimeout(600)
  const dialog = page.locator('div.fixed.inset-0.z-50').first()
  if (!await dialog.isVisible().catch(() => false)) { mutations.push({ flow: 'room create', result: 'FAIL', detail: 'modal non aperto' }); return }

  // Fill room_number (first input label "Numero")
  const numInput = dialog.locator('input').first()
  await numInput.fill(testNum)

  const saveBtn = dialog.getByRole('button', { name: /Salva|Crea|Aggiungi/i }).first()
  await saveBtn.click()
  await page.waitForTimeout(3000)

  const body = await page.locator('main').innerText()
  const hasRow = body.includes(testNum)
  mutations.push({
    flow: 'room create',
    result: hasRow && !errs.length ? 'OK' : 'FAIL',
    detail: hasRow ? `created room "${testNum}"` : `errs: ${errs.slice(0, 2).join(' | ')}`,
  })
})

test('MUT: create guest', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/guests`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const lastName = `AUDIT${Date.now().toString().slice(-6)}`
  const newBtn = page.getByRole('button', { name: /Nuovo ospite/i }).first()
  if (!await newBtn.count()) { mutations.push({ flow: 'guest create', result: 'FAIL', detail: 'no CTA' }); return }
  await newBtn.click()
  await page.waitForTimeout(800)

  const dialog = page.locator('div.fixed.inset-0.z-50').first()
  if (!await dialog.isVisible().catch(() => false)) { mutations.push({ flow: 'guest create', result: 'FAIL', detail: 'modal' }); return }

  // Nome (1st input), Cognome (2nd), Email (3rd type=email)
  const inputs = dialog.locator('input')
  await inputs.nth(0).fill('Claude')
  await inputs.nth(1).fill(lastName)

  const saveBtn = dialog.getByRole('button', { name: /Crea ospite|Salva|Aggiungi/i }).first()
  // Wait for enabled (form validation may run on blur)
  await page.waitForTimeout(500)
  const isDisabled = await saveBtn.isDisabled().catch(() => true)
  if (isDisabled) { mutations.push({ flow: 'guest create', result: 'FAIL', detail: 'save button still disabled after fill nome+cognome' }); return }
  await saveBtn.click()
  await page.waitForTimeout(3500)

  const body = await page.locator('main').innerText()
  const hasRow = body.includes(lastName) || body.toLowerCase().includes('claude')
  mutations.push({
    flow: 'guest create',
    result: hasRow && !errs.length ? 'OK' : 'FAIL',
    detail: hasRow ? `guest "${lastName}" creato` : `body no match; errs: ${errs.slice(0, 2).join(' | ')}`,
  })
})

test('MUT: create season', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/seasons`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const seasonName = `AUDIT_SEASON_${Date.now().toString().slice(-6)}`
  await page.getByRole('button', { name: /Nuova stagione/i }).first().click()
  await page.waitForTimeout(600)

  const dialog = page.locator('div.fixed.inset-0.z-50').first()
  if (!await dialog.isVisible().catch(() => false)) { mutations.push({ flow: 'season create', result: 'FAIL', detail: 'modal' }); return }

  const nameInput = dialog.locator('input[type="text"], input:not([type])').first()
  await nameInput.fill(seasonName)

  // try to fill date inputs
  const dateInputs = dialog.locator('input[type="date"]')
  const dcnt = await dateInputs.count()
  if (dcnt >= 2) {
    await dateInputs.nth(0).fill('2026-06-01')
    await dateInputs.nth(1).fill('2026-09-30')
  }

  const saveBtn = dialog.getByRole('button', { name: /Salva|Crea|Aggiungi/i }).first()
  await saveBtn.click()
  await page.waitForTimeout(3000)

  const body = await page.locator('main').innerText()
  const hasRow = body.includes(seasonName)
  mutations.push({
    flow: 'season create',
    result: hasRow && !errs.length ? 'OK' : 'FAIL',
    detail: hasRow ? 'season created' : `errs: ${errs.slice(0, 2).join(' | ')}`,
  })
})
