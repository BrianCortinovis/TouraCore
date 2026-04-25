#!/usr/bin/env tsx
import * as p from '@clack/prompts'
import { exec } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { PROVIDERS, CATEGORY_LABELS, type ProviderDef } from './registry'
import { readEnvLocal, updateEnvLocal, maskValue } from './lib/env-local'
import { upsertVercelEnv, listVercelEnvs, getVercelCtx, triggerRedeploy } from './lib/vercel'
import * as tests from './lib/test-providers'
import { logRotation, lastRotation, daysSince, ensureGitignore } from './lib/rotation-log'

ensureGitignore()

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

interface ProviderStatus {
  configured: number
  total: number
  testOk: boolean | null
  staleDays: number | null
}

async function statusFor(prov: ProviderDef, env: Record<string, string>): Promise<ProviderStatus> {
  const required = prov.fields.filter((f) => !f.optional)
  const configured = required.filter((f) => env[f.env]).length

  let testOk: boolean | null = null
  if (prov.testFn && configured === required.length) {
    const fn = tests[`test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests]
    if (typeof fn === 'function') {
      try {
        const r = await fn(env)
        testOk = r.ok
      } catch {
        testOk = false
      }
    }
  }

  const last = lastRotation(prov.id)
  const staleDays = last ? daysSince(last.ts) : null

  return { configured, total: required.length, testOk, staleDays }
}

function statusBadge(s: ProviderStatus, maxAgeDays?: number): string {
  if (s.configured === 0) return red('● not configured')
  if (s.configured < s.total) return yellow(`◐ partial (${s.configured}/${s.total})`)
  if (s.testOk === false) return red('● auth failed')
  if (s.staleDays !== null && maxAgeDays && s.staleDays > maxAgeDays) {
    return yellow(`◐ stale (${s.staleDays}d)`)
  }
  if (s.testOk === true) return green('● healthy')
  return cyan('○ configured')
}

function header() {
  console.clear()
  console.log()
  console.log(bold('  TouraCore Secrets Manager'))
  console.log(dim('  ────────────────────────────'))
  console.log(dim('  Centralized secret rotation · NEVER renders values · syncs .env.local + Vercel'))
  console.log()
}

async function dashboardOverview() {
  header()
  const env = readEnvLocal()
  const vctx = getVercelCtx()

  const sp = p.spinner()
  sp.start('Checking provider status...')
  const statuses = await Promise.all(
    PROVIDERS.map(async (prov) => ({ prov, status: await statusFor(prov, env) }))
  )
  sp.stop('Status loaded')

  const okCount = statuses.filter((s) => s.status.testOk === true).length
  const warnCount = statuses.filter(
    (s) => s.status.configured < s.status.total || s.status.testOk === false
  ).length

  console.log()
  console.log(`  ${bold('Vercel:')} ${vctx ? green('linked') : red('not linked — run `vercel login` first')}`)
  console.log(`  ${bold('Healthy:')} ${green(`${okCount}`)}/${statuses.length}    ${bold('Issues:')} ${warnCount > 0 ? red(`${warnCount}`) : green('0')}`)
  console.log()

  // Group by category
  const byCategory: Record<string, typeof statuses> = {}
  for (const s of statuses) {
    const k = s.prov.category
    if (!byCategory[k]) byCategory[k] = []
    byCategory[k]!.push(s)
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`  ${dim(CATEGORY_LABELS[cat] ?? cat)}`)
    for (const { prov, status } of items) {
      const badge = statusBadge(status, prov.rotateMaxAgeDays)
      console.log(`    ${badge.padEnd(35)} ${prov.name}`)
    }
    console.log()
  }

  return statuses
}

async function showProvider(prov: ProviderDef) {
  header()
  const env = readEnvLocal()
  const last = lastRotation(prov.id)

  console.log(`  ${bold(prov.name)}`)
  console.log(`  ${dim(CATEGORY_LABELS[prov.category] ?? prov.category)}`)
  console.log()

  if (prov.dashboardUrl) {
    console.log(`  ${dim('Dashboard:')}  ${cyan(prov.dashboardUrl)}`)
  }
  if (prov.rotateUrl) {
    console.log(`  ${dim('Rotate:')}     ${cyan(prov.rotateUrl)}`)
  }
  if (prov.docsUrl) {
    console.log(`  ${dim('Docs:')}       ${cyan(prov.docsUrl)}`)
  }
  console.log()

  console.log(`  ${dim('Environment variables:')}`)
  for (const f of prov.fields) {
    const v = env[f.env]
    const masked = f.sensitive ? maskValue(v) : (v ?? dim('—'))
    const tag = f.optional ? dim(' (optional)') : ''
    console.log(`    ${f.env.padEnd(30)} ${masked}${tag}`)
  }
  console.log()

  if (last) {
    const days = daysSince(last.ts)
    const stale = prov.rotateMaxAgeDays && days > prov.rotateMaxAgeDays
    console.log(`  ${dim('Last rotation:')} ${stale ? yellow(`${days}d ago`) : `${days}d ago`}`)
  } else {
    console.log(`  ${dim('Last rotation:')} ${dim('never (logged)')}`)
  }
  console.log()

  const action = await p.select({
    message: 'Action',
    options: [
      { value: 'test', label: '🩺  Test connection' },
      ...(prov.dashboardUrl ? [{ value: 'open', label: '🌐  Open dashboard in browser' }] : []),
      { value: 'rotate', label: '🔄  Rotate credentials' },
      { value: 'back', label: '←  Back' },
    ],
  })

  if (p.isCancel(action) || action === 'back') return

  if (action === 'open' && prov.dashboardUrl) {
    exec(`open "${prov.dashboardUrl}"`)
    p.note(prov.dashboardUrl, 'Opened in browser')
    await p.text({ message: 'Press enter to continue', placeholder: '' })
    return showProvider(prov)
  }

  if (action === 'test') {
    if (!prov.testFn) {
      p.note('No live test available for this provider', 'Skip')
    } else {
      const sp = p.spinner()
      sp.start(`Testing ${prov.name}...`)
      const fnKey = `test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests
      const fn = tests[fnKey]
      if (typeof fn === 'function') {
        try {
          const r = await fn(env)
          sp.stop(r.ok ? green(`✓ ${r.message}`) : red(`✗ ${r.message}`))
          logRotation({ ts: '', provider: prov.id, action: 'test', fields: [], vercelOk: r.ok })
        } catch (e) {
          sp.stop(red(`✗ ${e instanceof Error ? e.message : 'unknown'}`))
        }
      } else {
        sp.stop('No test function')
      }
    }
    await p.text({ message: 'Press enter to continue', placeholder: '' })
    return showProvider(prov)
  }

  if (action === 'rotate') {
    return rotateFlow(prov)
  }
}

async function rotateFlow(prov: ProviderDef) {
  header()
  console.log(`  ${bold('Rotate: ' + prov.name)}`)
  console.log()

  console.log(`  ${dim('Playbook:')}`)
  prov.rotateInstructions.forEach((step, i) => {
    console.log(`    ${dim(`${i + 1}.`)} ${step}`)
  })
  console.log()

  if (prov.rotateUrl) {
    const openIt = await p.confirm({ message: `Apri dashboard ${prov.name} ora?`, initialValue: true })
    if (p.isCancel(openIt)) return
    if (openIt) exec(`open "${prov.rotateUrl}"`)
  }

  // Special handling per security secrets (auto-generate)
  if (prov.id === 'cron' || prov.id === 'jwt') {
    const proceed = await p.confirm({
      message: `Genero nuovo secret 32-byte hex automaticamente?`,
      initialValue: true,
    })
    if (p.isCancel(proceed) || !proceed) return
    const newSecret = randomBytes(32).toString('hex')
    const field = prov.fields[0]!
    return persistRotation(prov, { [field.env]: newSecret })
  }

  if (prov.id === 'encryption') {
    p.note(
      red('⚠️  Rotazione ENCRYPTION_KEY rompe credenziali integrations cifrate esistenti.\nNON ANCORA SUPPORTATO da questo CLI — serve migration script dedicato.'),
      'BLOCKED'
    )
    await p.text({ message: 'Press enter to continue', placeholder: '' })
    return
  }

  // Manual rotation: chiede nuovi valori
  const updates: Record<string, string> = {}
  for (const f of prov.fields) {
    if (f.optional) {
      const skip = await p.confirm({
        message: `Vuoi aggiornare ${f.env}? (optional)`,
        initialValue: false,
      })
      if (p.isCancel(skip) || !skip) continue
    }
    const v = await p.password({
      message: `${f.env} ${f.sensitive ? dim('(masked)') : ''}`,
      mask: f.sensitive ? '•' : undefined,
    })
    if (p.isCancel(v)) return
    if (typeof v === 'string' && v.length > 0) updates[f.env] = v
  }

  if (Object.keys(updates).length === 0) {
    p.note('Nessun valore inserito', 'Skipped')
    return
  }

  return persistRotation(prov, updates)
}

async function persistRotation(prov: ProviderDef, updates: Record<string, string>) {
  // Test BEFORE persisting (where possible)
  if (prov.testFn) {
    const env = { ...readEnvLocal(), ...updates }
    const sp = p.spinner()
    sp.start('Testing nuovi valori...')
    const fn = tests[`test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests]
    if (typeof fn === 'function') {
      try {
        const r = await fn(env)
        if (!r.ok) {
          sp.stop(red(`✗ Test fallito: ${r.message}`))
          const force = await p.confirm({
            message: 'Test fallito. Procedo comunque (rischioso)?',
            initialValue: false,
          })
          if (p.isCancel(force) || !force) return
        } else {
          sp.stop(green(`✓ ${r.message}`))
        }
      } catch (e) {
        sp.stop(red(`✗ ${e instanceof Error ? e.message : 'unknown'}`))
      }
    } else {
      sp.stop('No test fn')
    }
  }

  // Update .env.local
  const sp1 = p.spinner()
  sp1.start('Updating apps/web/.env.local (backup auto)')
  let envLocalOk = true
  try {
    updateEnvLocal(updates)
  } catch {
    envLocalOk = false
  }
  sp1.stop(envLocalOk ? green('✓ .env.local aggiornato') : red('✗ .env.local errore'))

  // Update Vercel
  const vctx = getVercelCtx()
  let vercelOk = true
  if (vctx) {
    const sp2 = p.spinner()
    sp2.start('Updating Vercel (production + preview + development)')
    for (const [k, v] of Object.entries(updates)) {
      const r = await upsertVercelEnv(k, v)
      if (!r.ok) vercelOk = false
    }
    sp2.stop(vercelOk ? green('✓ Vercel sincronizzato') : red('✗ Vercel errore parziale'))
  } else {
    p.note('Vercel non linked — solo .env.local aggiornato', dim('Skipped Vercel'))
    vercelOk = false
  }

  // Optional redeploy
  if (vercelOk) {
    const redep = await p.confirm({
      message: 'Trigger redeploy production ora?',
      initialValue: false,
    })
    if (!p.isCancel(redep) && redep) {
      const sp3 = p.spinner()
      sp3.start('Redeploying...')
      const url = await triggerRedeploy()
      sp3.stop(url ? green(`✓ deploying https://${url}`) : red('✗ redeploy fallito'))
    }
  }

  logRotation({
    ts: '',
    provider: prov.id,
    action: 'rotate',
    fields: Object.keys(updates),
    envLocalOk,
    vercelOk,
  })

  p.note('Rotation log scritto in .secrets-rotations.log', green('✓ Done'))
  await p.text({ message: 'Press enter to continue', placeholder: '' })
}

async function vercelDiffMenu() {
  header()
  console.log(`  ${bold('Vercel ↔ .env.local diff')}`)
  console.log()
  const sp = p.spinner()
  sp.start('Loading Vercel envs...')
  const vEnvs = await listVercelEnvs()
  const local = readEnvLocal()
  sp.stop('Loaded')

  const allKeys = new Set<string>()
  vEnvs.forEach((e) => allKeys.add(e.key))
  Object.keys(local).forEach((k) => allKeys.add(k))

  let onlyVercel = 0
  let onlyLocal = 0
  let both = 0
  console.log()
  for (const key of [...allKeys].sort()) {
    const inV = vEnvs.some((e) => e.key === key)
    const inL = !!local[key]
    if (inV && inL) both++
    else if (inV) onlyVercel++
    else onlyLocal++
  }
  console.log(`  ${green(`${both}`)} entries in both`)
  console.log(`  ${yellow(`${onlyVercel}`)} only on Vercel`)
  console.log(`  ${yellow(`${onlyLocal}`)} only in .env.local`)
  console.log()

  const showDiff = await p.confirm({
    message: 'Show diff details (key names only, no values)?',
    initialValue: false,
  })
  if (!p.isCancel(showDiff) && showDiff) {
    console.log()
    for (const key of [...allKeys].sort()) {
      const inV = vEnvs.some((e) => e.key === key)
      const inL = !!local[key]
      const tag = inV && inL ? green('✓ both') : inV ? yellow('vercel only') : yellow('local only')
      console.log(`  ${tag.padEnd(20)} ${key}`)
    }
  }
  console.log()
  await p.text({ message: 'Press enter to continue', placeholder: '' })
}

async function main() {
  p.intro(bold('  TouraCore · Secrets Manager  '))

  while (true) {
    await dashboardOverview()
    const choice = await p.select({
      message: 'Cosa vuoi fare?',
      options: [
        ...PROVIDERS.map((p) => ({ value: p.id, label: `→  ${p.name}` })),
        { value: '__diff', label: '📋  Vercel ↔ .env.local diff' },
        { value: '__exit', label: '✕  Exit' },
      ],
    })

    if (p.isCancel(choice) || choice === '__exit') {
      p.outro(dim('Bye.'))
      process.exit(0)
    }

    if (choice === '__diff') {
      await vercelDiffMenu()
      continue
    }

    const prov = PROVIDERS.find((x) => x.id === choice)
    if (prov) await showProvider(prov)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
