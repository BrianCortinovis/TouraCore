import { test } from '@playwright/test'

const TENANT = 'villa-irabo'
const ENTITY = 'villa-irabo'
const BASE = `/${TENANT}/stays/${ENTITY}`

type Row = { area: string; verdict: string; detail: string }
const rows: Row[] = []

test.describe.configure({ mode: 'serial' })
test.afterAll(() => {
  console.log('\n====== STAYS EXTRAS AUDIT ======')
  rows.forEach(r => console.log(`[${r.verdict}] ${r.area} — ${r.detail}`))
  console.log('===============================\n')
})

async function noise(page: any, errs: string[]) {
  const ig = (t: string) => /vercel-scripts|va\.vercel|speed-insights|hydrated|favicon/i.test(t)
  page.on('pageerror', (e: any) => { if (!ig(e.message)) errs.push(e.message.slice(0, 120)) })
  page.on('console', (m: any) => { if (m.type()==='error') { const t=m.text(); if (!ig(t)) errs.push(t.slice(0,120)) } })
  page.on('response', (r: any) => { if (r.status() >= 500) errs.push(`HTTP5xx ${r.status()}`) })
}

// Channels adapter predisposti senza API key
test('AREA: channels catalog', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/channels`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const providers = ['Booking', 'Airbnb', 'Expedia', 'Vrbo', 'Octorate', 'Hostaway', 'Smoobu', 'Lodgify', 'Hospitable', 'SiteMinder']
  const found = providers.filter(p => text.includes(p))
  // Ci sono CTA per connetterli?
  const configBtns = await page.getByRole('button', { name: /Configur|Connett|Collega|Attiva/i }).count()
  rows.push({
    area: 'channels-catalog',
    verdict: found.length >= 3 && configBtns > 0 ? 'PREDISPOSTO' : 'PARZIALE',
    detail: `providers visibili: ${found.join(', ')} | cfgBtns:${configBtns}`,
  })
})

// Alloggiati export (compliance)
test('AREA: alloggiati export UI', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/compliance/alloggiati`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasExport = /Genera|Export|Download|Esporta|TXT|file/i.test(text)
  const hasCred = /credenziali|username|password/i.test(text)
  rows.push({
    area: 'alloggiati-export',
    verdict: hasExport ? 'PREDISPOSTO' : 'MANCANTE',
    detail: `export_ui:${hasExport} cred_ui:${hasCred}`,
  })
})

// ISTAT
test('AREA: istat', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/compliance/istat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /istat|regione|movimento|presenze|mensile/i.test(text)
  rows.push({ area: 'istat', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 100) })
})

// Tourist tax config form
test('AREA: tourist-tax config', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/compliance/tourist-tax`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasCfg = /importo|tariffa|esenzion|età|notti/i.test(text)
  rows.push({ area: 'tourist-tax', verdict: hasCfg ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Self check-in token generator
test('AREA: self-checkin invite', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/self-checkin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasTokenUI = /token|link|invit|QR|email/i.test(text)
  rows.push({ area: 'self-checkin', verdict: hasTokenUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Smart locks integrations
test('AREA: locks', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/locks`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /lock|serratura|codice|PIN|TTLock|Nuki|August/i.test(text)
  const brands = ['TTLock', 'Nuki', 'August', 'Igloo', 'Salto', 'Yale'].filter(b => text.includes(b))
  rows.push({ area: 'locks', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: `brands: ${brands.join(',')}` })
})

// Invoices SDI configuration
test('AREA: invoices SDI', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/invoices`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasSDI = /SDI|XML|elettronic|fattura|imponibile|IVA/i.test(text)
  rows.push({ area: 'invoices-sdi', verdict: hasSDI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Accounting integrations
test('AREA: accounting', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/accounting`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const providers = ['QuickBooks', 'Xero', 'Fattura', 'Aruba', 'TeamSystem', 'Zucchetti', 'Datev']
  const found = providers.filter(p => text.includes(p))
  rows.push({ area: 'accounting', verdict: found.length > 0 ? 'PREDISPOSTO' : 'PARZIALE', detail: `providers:${found.join(',')}` })
})

// Rate-plan mutation attempted (writes happen on wrong entity — documented bug)
test('AREA: planning calendar', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/planning`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const text = await page.locator('main').innerText()
  const hasGrid = /calendar|calendario|mese|settimana|drag|lun|mar|mer/i.test(text)
  rows.push({ area: 'planning', verdict: hasGrid ? 'PREDISPOSTO' : 'PARZIALE', detail: text.slice(0, 120) })
})

// Reviews management
test('AREA: reviews', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /recension|stelle|rating|rispost|importa/i.test(text)
  rows.push({ area: 'reviews', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Competitive pricing
test('AREA: competitive', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/competitive`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /concorrent|prezzo|mercato|analisi|confront/i.test(text)
  rows.push({ area: 'competitive', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// FX rates
test('AREA: fx-rates', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/fx-rates`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /cambio|valut|EUR|USD|GBP|rate|tasso/i.test(text)
  rows.push({ area: 'fx-rates', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Supplies inventory
test('AREA: supplies', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/supplies`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /scorte|inventario|consumi|pulizi|fornit/i.test(text)
  rows.push({ area: 'supplies', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Guidebooks
test('AREA: guidebooks', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/guidebooks`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /guida|poi|ristorant|luogo|punto/i.test(text)
  rows.push({ area: 'guidebooks', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Messaggi inbox
test('AREA: messaggi', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/messaggi`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /conversazion|thread|messag|ospite|canale/i.test(text)
  rows.push({ area: 'messaggi', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Housekeeping templates + tasks
test('AREA: housekeeping', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/housekeeping-templates`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /checklist|template|pulizi|task|passagg/i.test(text)
  rows.push({ area: 'housekeeping', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})

// Reports
test('AREA: reportistica', async ({ page }) => {
  const errs: string[] = []
  await noise(page, errs)
  await page.goto(`${BASE}/reportistica`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const text = await page.locator('main').innerText()
  const hasUI = /report|KPI|ADR|RevPAR|occupaz|grafic/i.test(text)
  rows.push({ area: 'reportistica', verdict: hasUI ? 'PREDISPOSTO' : 'MANCANTE', detail: text.slice(0, 120) })
})
