import { test } from '@playwright/test'

const TENANT = 'villa-irabo'

type Vertical = { name: string; entity: string; routes: string[] }

const VERTICALS: Vertical[] = [
  {
    name: 'dine',
    entity: 'trattoria-del-borgo',
    routes: [
      '',
      'analytics',
      'booking-engine',
      'fiscal',
      'floor-plan',
      'haccp',
      'inventory',
      'kds',
      'menu',
      'orders',
      'pos',
      'reservations',
      'settings',
      'staff',
      'waitlist',
    ],
  },
  {
    name: 'rides',
    entity: 'alpina-bikes-gardone',
    routes: ['', 'booking-engine', 'channels', 'fleet', 'locations', 'reservations'],
  },
  {
    name: 'activities',
    entity: 'motoslitte-livigno-adventure',
    routes: [
      '',
      'booking-engine',
      'catalog',
      'channels',
      'checkin',
      'manifest',
      'reservations',
      'resources',
      'schedule',
      'settings',
      'slots',
      'waivers',
    ],
  },
]

type Row = { vertical: string; route: string; status: 'OK' | 'EMPTY' | 'ERROR' | 'NOT_FOUND' | 'HTTP5XX'; detail: string }
const rows: Row[] = []

test.describe.configure({ mode: 'default' })
test.use({ bypassCSP: true })
test.afterAll(() => {
  console.log('\n====== VERTICALS AUDIT ======')
  for (const v of VERTICALS) {
    console.log(`\n[${v.name.toUpperCase()}] ${v.entity}`)
    rows.filter(r => r.vertical === v.name).forEach(r => {
      console.log(`  [${r.status}] ${r.route || '(home)'}  — ${r.detail.slice(0, 140)}`)
    })
  }
  const ok = rows.filter(r => r.status === 'OK').length
  const err = rows.filter(r => r.status === 'ERROR').length
  const nf = rows.filter(r => r.status === 'NOT_FOUND').length
  const h5 = rows.filter(r => r.status === 'HTTP5XX').length
  const empty = rows.filter(r => r.status === 'EMPTY').length
  console.log(`\nTOT ${rows.length} | OK ${ok} | EMPTY ${empty} | ERR ${err} | 404 ${nf} | 5xx ${h5}`)
  console.log('==============================\n')
})

for (const v of VERTICALS) {
  for (const r of v.routes) {
    const label = `${v.name}/${r || '(home)'}`
    test(`VERTICALS: ${label}`, async ({ page }) => {
      const errs: string[] = []
      const ignore = (t: string) => /vercel-scripts|va\.vercel|speed-insights|hydrated|favicon|manifest\.json|_rsc=|_next\/static|Content Security Policy/i.test(t)

      page.on('pageerror', (e) => { if (!ignore(e.message)) errs.push('JS:' + e.message.slice(0, 120)) })
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        const t = m.text(); if (ignore(t)) return
        errs.push('C:' + t.slice(0, 120))
      })
      let http5xx: number | null = null
      page.on('response', (resp) => {
        if (resp.status() >= 500) http5xx = resp.status()
      })

      const url = r ? `/${TENANT}/${v.name}/${v.entity}/${r}` : `/${TENANT}/${v.name}/${v.entity}`
      const resp = await page.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch((e) => {
        errs.push('nav:' + e.message.slice(0, 80))
        return null
      })

      const code = resp?.status() ?? 0
      if (code === 404) { rows.push({ vertical: v.name, route: r, status: 'NOT_FOUND', detail: 'HTTP 404' }); return }
      if (code >= 500 || http5xx) { rows.push({ vertical: v.name, route: r, status: 'HTTP5XX', detail: `HTTP ${http5xx ?? code}` }); return }

      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(3000)
      const text = await page.locator('main, body').first().innerText().catch(() => '')

      // Detect visible Postgres or runtime error copy
      const errMatch = text.match(/does not exist|column .+ does not exist|TypeError|Cannot read|undefined is not|500\s+Internal|Application error/i)
      if (errMatch) {
        rows.push({ vertical: v.name, route: r, status: 'ERROR', detail: `UI-err: ${errMatch[0]}` })
        return
      }

      if (errs.length > 0) {
        rows.push({ vertical: v.name, route: r, status: 'ERROR', detail: errs.slice(0, 2).join(' | ') })
        return
      }
      if (text.trim().length < 200) {
        rows.push({ vertical: v.name, route: r, status: 'EMPTY', detail: text.slice(0, 80) })
        return
      }

      // Quick interaction signature
      const btns = await page.locator('button:visible').count()
      const cta = page.locator('button,a').filter({ hasText: /Nuov[oa]|Aggiungi|Crea|Configura|Invita|Genera|Avvia/i }).first()
      const ctaText = (await cta.innerText().catch(() => '')).slice(0, 40)
      rows.push({ vertical: v.name, route: r, status: 'OK', detail: `btns=${btns} cta="${ctaText}"` })
    })
  }
}
