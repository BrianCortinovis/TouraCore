import { test } from '@playwright/test'

const TENANT = 'villa-irabo'
const ENTITY = 'villa-irabo'
const BASE = `/${TENANT}/stays/${ENTITY}`

type Flow = { name: string; status: 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIPPED'; details: string[] }
const flows: Flow[] = []
function log(name: string, status: Flow['status'], ...details: string[]) {
  flows.push({ name, status, details })
}

test.describe.configure({ mode: 'serial' })

test.afterAll(() => {
  console.log('\n====== STAYS FLOWS REPORT ======')
  for (const f of flows) {
    console.log(`[${f.status}] ${f.name}`)
    for (const d of f.details) console.log('   - ' + d)
  }
  const pass = flows.filter(x => x.status === 'PASS').length
  const partial = flows.filter(x => x.status === 'PARTIAL').length
  const fail = flows.filter(x => x.status === 'FAIL').length
  console.log(`\nTotale: ${flows.length} | PASS:${pass} PARTIAL:${partial} FAIL:${fail}`)
  console.log('================================\n')
})

async function setupNoise(page: any, errors: string[]) {
  const ignore = (t: string) => /vercel-scripts|va\.vercel|speed-insights|hydrated|favicon|manifest\.json/i.test(t)
  page.on('pageerror', (e: any) => { if (!ignore(e.message)) errors.push('JS:' + e.message.slice(0, 120)) })
  page.on('console', (m: any) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (ignore(t)) return
    errors.push('CONSOLE:' + t.slice(0, 120))
  })
  page.on('response', (r: any) => {
    if (r.status() >= 500) errors.push(`HTTP5xx:${r.status()} ${r.url().slice(-60)}`)
  })
}

// ----- FLOW 1: Home dashboard KPI -----
test('FLOW: home KPI rendering', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const body = await page.locator('main').innerText()
  const kpis = ['Arrivi', 'Partenze', 'Occupazione', 'Fatturato', 'ADR', 'RevPAR']
  const missing = kpis.filter(k => !body.includes(k))
  if (errs.length) { log('Home KPI', 'FAIL', ...errs.slice(0, 3)); return }
  if (missing.length) log('Home KPI', 'PARTIAL', 'missing: ' + missing.join(', '))
  else log('Home KPI', 'PASS', 'all 6 KPI visible')
})

// ----- FLOW 2: Rooms list + modal apertura -----
test('FLOW: rooms list + new modal', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/rooms`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const hasTable = /Numero|Nome|Prezzo|NUMERO|Disponibile/i.test(body)
  const newBtn = page.getByRole('button', { name: /Nuovo appartamento/i }).first()
  if (!await newBtn.count()) { log('Rooms', 'FAIL', 'no CTA button'); return }
  await newBtn.click()
  await page.waitForTimeout(700)
  const modalVisible = await page.locator('[role="dialog"], .modal, [data-state="open"]').first().isVisible().catch(() => false)
  if (errs.length) { log('Rooms', 'FAIL', ...errs.slice(0, 3)); return }
  if (hasTable && modalVisible) log('Rooms', 'PASS', 'table rendered + modal opens')
  else log('Rooms', 'PARTIAL', `table=${hasTable} modal=${modalVisible}`)
})

// ----- FLOW 3: Bookings list + filters -----
test('FLOW: bookings list', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/bookings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const hasData = /Nessuna|prenotazion|Booking/i.test(body)
  if (errs.length) { log('Bookings', 'FAIL', ...errs.slice(0, 3)); return }
  log('Bookings', hasData ? 'PASS' : 'PARTIAL', `body hints: ${body.split('\n').slice(0, 3).join(' | ').slice(0, 120)}`)
})

// ----- FLOW 4: Rate-plans create modal -----
test('FLOW: rate-plans new modal', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/rate-plans`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const newBtn = page.getByRole('button', { name: /Nuovo piano/i }).first()
  const count = await newBtn.count()
  if (!count) { log('Rate-plans', 'FAIL', 'no CTA'); return }
  await newBtn.click()
  await page.waitForTimeout(700)
  const modalVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false)
  if (errs.length) { log('Rate-plans', 'FAIL', ...errs.slice(0, 3)); return }
  log('Rate-plans', modalVisible ? 'PASS' : 'PARTIAL', `modal=${modalVisible}`)
})

// ----- FLOW 5: Seasons create modal -----
test('FLOW: seasons new modal', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/seasons`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const newBtn = page.getByRole('button', { name: /Nuova stagione/i }).first()
  if (!await newBtn.count()) { log('Seasons', 'FAIL', 'no CTA'); return }
  await newBtn.click()
  await page.waitForTimeout(700)
  const modalVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false)
  if (errs.length) { log('Seasons', 'FAIL', ...errs.slice(0, 3)); return }
  log('Seasons', modalVisible ? 'PASS' : 'PARTIAL', `modal=${modalVisible}`)
})

// ----- FLOW 6: Channels catalog + stub adapter senza API key -----
test('FLOW: channels catalog', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/channels`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const providers = ['Booking', 'Airbnb', 'Expedia', 'Octorate', 'Vrbo']
  const found = providers.filter(p => body.includes(p))
  if (errs.length) { log('Channels', 'FAIL', ...errs.slice(0, 3)); return }
  log('Channels', found.length >= 2 ? 'PASS' : 'PARTIAL', `providers visible: ${found.join(',')}`)
})

// ----- FLOW 7: Invoices list + new modal -----
test('FLOW: invoices new', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/invoices`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const newBtn = page.getByRole('button', { name: /Nuova fattura/i }).first()
  if (!await newBtn.count()) { log('Invoices', 'FAIL', 'no CTA'); return }
  await newBtn.click()
  await page.waitForTimeout(700)
  const modalVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false)
  if (errs.length) { log('Invoices', 'FAIL', ...errs.slice(0, 3)); return }
  log('Invoices', modalVisible ? 'PASS' : 'PARTIAL', `modal=${modalVisible}`)
})

// ----- FLOW 8: Compliance tourist-tax config -----
test('FLOW: tourist-tax config', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/compliance/tourist-tax`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const hasConfig = /Configurazione|Importo|Esenzioni|Tariffa/i.test(body)
  if (errs.length) { log('Tourist-tax', 'FAIL', ...errs.slice(0, 3)); return }
  log('Tourist-tax', hasConfig ? 'PASS' : 'PARTIAL', `config UI: ${hasConfig}`)
})

// ----- FLOW 9: Alloggiati compliance -----
test('FLOW: alloggiati', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/compliance/alloggiati`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const hasUI = /alloggiati|export|genera|download/i.test(body)
  if (errs.length) { log('Alloggiati', 'FAIL', ...errs.slice(0, 3)); return }
  log('Alloggiati', hasUI ? 'PASS' : 'PARTIAL', body.split('\n').slice(0, 4).join('|').slice(0, 120))
})

// ----- FLOW 10: Self check-in -----
test('FLOW: self-checkin', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/self-checkin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const hasUI = /invito|link|token|check-in|ospite/i.test(body)
  if (errs.length) { log('Self-checkin', 'FAIL', ...errs.slice(0, 3)); return }
  log('Self-checkin', hasUI ? 'PASS' : 'PARTIAL', body.split('\n').slice(0, 3).join('|').slice(0, 120))
})

// ----- FLOW 11: Guests management -----
test('FLOW: guests', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/guests`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const count = (body.match(/ospite|guest/gi) || []).length
  const hasAnyGuest = /briansnow|@gmail|@email|\.it|\.com/i.test(body)
  if (errs.length) { log('Guests', 'FAIL', ...errs.slice(0, 3)); return }
  log('Guests', hasAnyGuest ? 'PASS' : 'PARTIAL', `guest hits: ${count}, dataVisible:${hasAnyGuest}`)
})

// ----- FLOW 12: Settings tabs -----
test('FLOW: settings', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const body = await page.locator('main').innerText()
  const sections = ['Generale', 'Contatti', 'Fiscale', 'Policy', 'Notifiche', 'Brand']
  const found = sections.filter(s => body.includes(s))
  if (errs.length) { log('Settings', 'FAIL', ...errs.slice(0, 3)); return }
  log('Settings', found.length > 0 ? 'PASS' : 'PARTIAL', `sezioni: ${found.join(',')}`)
})

// ----- FLOW 13: Public booking engine preview -----
test('FLOW: booking-engine preview', async ({ page }) => {
  const errs: string[] = []
  await setupNoise(page, errs)
  await page.goto(`${BASE}/booking-engine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const body = await page.locator('main').innerText()
  const hasUI = /anteprima|preview|booking|embed|URL|widget|colore/i.test(body)
  if (errs.length) { log('Booking-engine', 'FAIL', ...errs.slice(0, 3)); return }
  log('Booking-engine', hasUI ? 'PASS' : 'PARTIAL', body.split('\n').slice(0, 3).join('|').slice(0, 120))
})

// ----- FLOW 14: Public booking flow /book -----
test('FLOW: public book cart', async ({ browser }) => {
  const errs: string[] = []
  const ctx = await browser.newContext() // anon
  const page = await ctx.newPage()
  await setupNoise(page, errs)
  await page.goto(`/book/${ENTITY}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const body = await page.locator('body').innerText().catch(() => '')
  const hasSomething = body.trim().length > 200
  await ctx.close()
  if (errs.length) { log('Public book', 'FAIL', ...errs.slice(0, 3)); return }
  log('Public book', hasSomething ? 'PASS' : 'PARTIAL', body.slice(0, 120))
})

// ----- FLOW 15: Public listing /s/[tenant]/[entity] -----
test('FLOW: public listing', async ({ browser }) => {
  const errs: string[] = []
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await setupNoise(page, errs)
  const resp = await page.goto(`/s/${TENANT}/${ENTITY}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const status = resp?.status() ?? 0
  const body = await page.locator('body').innerText().catch(() => '')
  const _hasBE = body.includes('Prenota') || body.includes('booking') || body.includes('camere')
  await ctx.close()
  if (status >= 400) { log('Public listing', 'FAIL', `HTTP ${status}`); return }
  if (errs.length) { log('Public listing', 'FAIL', ...errs.slice(0, 3)); return }
  log('Public listing', 'PASS', `HTTP ${status}, body: ${body.slice(0, 80)}`)
})
