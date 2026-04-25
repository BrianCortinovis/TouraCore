import { test } from '@playwright/test'

const TENANT = 'villa-irabo'
const ENTITY = 'villa-irabo'
const BASE = `/${TENANT}/stays/${ENTITY}`

type AuditRow = {
  route: string
  status: 'OK' | 'EMPTY' | 'ERROR' | 'NOT_FOUND' | 'NO_INTERACTION'
  findings: string[]
  mutations: string[]
}

const results: AuditRow[] = []

function record(route: string, status: AuditRow['status'], findings: string[], mutations: string[] = []) {
  results.push({ route, status, findings, mutations })
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  results.length = 0
})

test.afterAll(async () => {
  console.log('\n====== STAYS AUDIT REPORT ======')
  for (const r of results) {
    console.log(`[${r.status}] ${r.route}`)
    if (r.findings.length) console.log('  findings: ' + r.findings.join(' | '))
    if (r.mutations.length) console.log('  mutations: ' + r.mutations.join(' | '))
  }
  const ok = results.filter(r => r.status === 'OK').length
  const err = results.filter(r => r.status === 'ERROR').length
  const notFound = results.filter(r => r.status === 'NOT_FOUND').length
  console.log(`\nTotale: ${results.length} | OK: ${ok} | ERR: ${err} | NOT_FOUND: ${notFound}`)
  console.log('================================\n')
})

const routes = [
  'page.tsx',
  'planning',
  'bookings',
  'check-in',
  'check-out',
  'guests',
  'messaggi',
  'reviews',
  'rooms',
  'room-blocks',
  'self-checkin',
  'locks',
  'guidebooks',
  'rate-plans',
  'seasons',
  'booking-engine',
  'services',
  'reportistica',
  'invoices',
  'compliance/alloggiati',
  'compliance/istat',
  'compliance/tourist-tax',
  'operations',
  'media',
  'channels',
  'housekeeping-templates',
  'supplies',
  'settings',
  'competitive',
  'accounting',
  'fx-rates',
] as const

for (const route of routes) {
  const url = route === 'page.tsx' ? BASE : `${BASE}/${route}`
  const label = route === 'page.tsx' ? '(home)' : route

  test(`audit stays/${label}`, async ({ page }) => {
    const findings: string[] = []
    const errors: string[] = []

    const ignoreNoise = (t: string) =>
      /vercel-scripts|Content Security Policy|va\.vercel|speed-insights|hydrated but some attributes|Failed to load resource.+204|Failed to load resource.+304|_next\/static|favicon|manifest\.json|_rsc=/i.test(t)

    page.on('pageerror', (err) => {
      if (!ignoreNoise(err.message)) errors.push(`pageerror: ${err.message.slice(0, 140)}`)
    })
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const t = msg.text()
      if (ignoreNoise(t)) return
      errors.push(`console: ${t.slice(0, 140)}`)
    })
    page.on('response', (res) => {
      if (res.status() >= 500 && !res.url().includes('_next/static')) {
        errors.push(`http5xx: ${res.status()} ${res.url().slice(-80)}`)
      }
    })

    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => {
      errors.push(`nav: ${e.message.slice(0, 100)}`)
      return null
    })

    const status = resp?.status() ?? 0

    if (status === 404 || status >= 500) {
      record(label, status === 404 ? 'NOT_FOUND' : 'ERROR', [`HTTP ${status}`, ...errors])
      return
    }

    // Wait extra for client-side data
    await page.waitForTimeout(800)

    // Detect main content
    const bodyText = await page.locator('main, body').first().innerText().catch(() => '')
    const hasLoading = /Caricamento|Loading/i.test(bodyText)
    if (hasLoading) {
      await page.waitForTimeout(2500)
    }

    const finalText = await page.locator('main, body').first().innerText().catch(() => '')

    // Look for placeholder markers
    if (/Coming soon|Prossimamente|In sviluppo|Nessun dato|Funzione non disponibile/i.test(finalText)) {
      findings.push('possible placeholder copy')
    }
    if (/errore|error/i.test(finalText) && !/senza errori/i.test(finalText)) {
      const errMatch = finalText.match(/.{0,40}errore.{0,80}/i)
      if (errMatch) findings.push(`copy:${errMatch[0].replace(/\s+/g, ' ').slice(0, 80)}`)
    }

    // Count interactive elements
    const btnCount = await page.locator('button:visible').count()
    const _linkCount = await page.locator('a:visible').count()
    const inputCount = await page.locator('input:visible,select:visible,textarea:visible').count()
    findings.push(`btns=${btnCount} inputs=${inputCount}`)

    // Find a primary CTA (Nuovo/Aggiungi/Crea)
    const cta = page.locator('button,a').filter({ hasText: /Nuov[oa]|Aggiungi|Crea|Configura|Invita|Genera/i }).first()
    const ctaCount = await cta.count()
    if (ctaCount > 0) {
      findings.push(`primary_cta=${(await cta.innerText().catch(() => '')).slice(0, 40)}`)
    }

    if (errors.length > 0) {
      record(label, 'ERROR', [...findings, ...errors.slice(0, 3)])
    } else if (finalText.trim().length < 100) {
      record(label, 'EMPTY', findings)
    } else {
      record(label, 'OK', findings)
    }
  })
}
