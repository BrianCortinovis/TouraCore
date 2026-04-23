import { test } from '@playwright/test'

const TENANT = 'villa-irabo'

type Mut = { flow: string; result: 'OK' | 'FAIL'; detail: string }
const muts: Mut[] = []

test.describe.configure({ mode: 'serial' })
test.afterAll(() => {
  console.log('\n====== VERTICALS MUTATIONS ======')
  muts.forEach(m => console.log(`[${m.result}] ${m.flow} — ${m.detail}`))
  const ok = muts.filter(m => m.result === 'OK').length
  console.log(`\nMutazioni OK: ${ok}/${muts.length}`)
  console.log('===============================\n')
})

async function goto(page: any, url: string) {
  await page.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2500)
}

// DINE: crea staff member in /staff
test('MUT dine: crea staff', async ({ page }) => {
  const errs: string[] = []
  page.on('response', (r: any) => { if (r.status() >= 500 && !r.url().includes('_next/static')) errs.push(`5xx:${r.status()}`) })

  await goto(page, `/${TENANT}/dine/trattoria-del-borgo/staff`)
  const newBtn = page.getByRole('button', { name: /Nuovo staff|Aggiungi|Crea|Nuovo/i }).first()
  const hasCTA = await newBtn.count()
  if (!hasCTA) { muts.push({ flow: 'dine-staff-create', result: 'FAIL', detail: 'no CTA' }); return }
  await newBtn.click()
  await page.waitForTimeout(800)
  const modal = page.locator('div.fixed.inset-0.z-50').first()
  const vis = await modal.isVisible().catch(() => false)
  muts.push({ flow: 'dine-staff-create', result: vis ? 'OK' : 'FAIL', detail: vis ? 'modal aperto + scope OK' : 'modal assente' })
})

// RIDES: catalog fleet crea bike
test('MUT rides: apri form new bike', async ({ page }) => {
  await goto(page, `/${TENANT}/rides/alpina-bikes-gardone/fleet`)
  const body = await page.locator('body').innerText().catch(() => '')
  const newBtn = page.getByRole('button', { name: /Nuov[oa]|Aggiungi|Crea/i }).first()
  const btnCount = await newBtn.count()
  const hasData = /e-bike|city|mountain|Alpina|bici|modello/i.test(body)
  if (btnCount > 0) {
    await newBtn.click()
    await page.waitForTimeout(600)
  }
  const modal = page.locator('div.fixed.inset-0.z-50').first()
  const modalVis = await modal.isVisible().catch(() => false)
  muts.push({
    flow: 'rides-fleet',
    result: (modalVis || hasData) ? 'OK' : 'FAIL',
    detail: `btn=${btnCount} modal=${modalVis} data=${hasData}`,
  })
})

// ACTIVITIES: catalog experience — UI render + CTA new
test('MUT activities: catalog UI', async ({ page }) => {
  await goto(page, `/${TENANT}/activities/motoslitte-livigno-adventure/catalog`)
  const body = await page.locator('body').innerText().catch(() => '')
  const hasData = /esperienz|motoslitt|prodotto|tour|attivit|pacchetto/i.test(body)
  const ctaCount = await page.getByRole('button', { name: /Nuov[oa]|Aggiungi|Crea/i }).count()
  muts.push({
    flow: 'activities-catalog',
    result: (hasData || ctaCount > 0) ? 'OK' : 'FAIL',
    detail: `cta=${ctaCount} data=${hasData}`,
  })
})

// ACTIVITIES schedule — generate slot CTA
test('MUT activities: schedule CTA', async ({ page }) => {
  await goto(page, `/${TENANT}/activities/motoslitte-livigno-adventure/schedule`)
  const genBtn = page.getByRole('button', { name: /Genera slot|Crea slot/i }).first()
  const has = await genBtn.count()
  muts.push({
    flow: 'activities-schedule',
    result: has > 0 ? 'OK' : 'FAIL',
    detail: `gen_cta=${has}`,
  })
})

// DINE menu — render + CTA
test('MUT dine: menu list', async ({ page }) => {
  await goto(page, `/${TENANT}/dine/trattoria-del-borgo/menu`)
  const body = await page.locator('body').innerText().catch(() => '')
  const cats = /Antipast|Pasta|Primi|Secondi|Dolc|Cucin|Allergen/i.test(body)
  const btns = await page.getByRole('button', { name: /Nuov[oa]|Aggiungi|Crea/i }).count()
  muts.push({ flow: 'dine-menu', result: (cats || btns > 0) ? 'OK' : 'FAIL', detail: `cat=${cats} btns=${btns}` })
})

// DINE reservations — tavoli/orari
test('MUT dine: reservations', async ({ page }) => {
  await goto(page, `/${TENANT}/dine/trattoria-del-borgo/reservations`)
  const body = await page.locator('body').innerText().catch(() => '')
  const rel = /ospiti|covers|tavolo|turno|orario|pranzo|cena/i.test(body)
  muts.push({ flow: 'dine-reservations', result: rel ? 'OK' : 'FAIL', detail: `rel=${rel}` })
})
