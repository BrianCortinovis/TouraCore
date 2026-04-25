#!/usr/bin/env tsx
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { exec } from 'node:child_process'
import { PROVIDERS, CATEGORY_LABELS, CATEGORY_META, type ProviderDef } from '../registry'
import { readEnvLocal, updateEnvLocal, maskValue } from '../lib/env-local'
import { upsertVercelEnv, listVercelEnvs, getVercelCtx, triggerRedeploy } from '../lib/vercel'
import * as tests from '../lib/test-providers'
import { logRotation, lastRotation, daysSince, ensureGitignore } from '../lib/rotation-log'

ensureGitignore()

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML_PATH = resolve(__dirname, 'ui.html')

const SESSION_TOKEN = randomBytes(24).toString('hex')

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((res, rej) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => res(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', rej)
  })
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function checkAuth(req: IncomingMessage): boolean {
  const url = new URL(req.url ?? '/', 'http://x')
  const token = url.searchParams.get('t') ?? req.headers['x-session-token']
  return token === SESSION_TOKEN
}

async function statusFor(prov: ProviderDef, env: Record<string, string>) {
  const required = prov.fields.filter((f) => !f.optional)
  const configured = required.filter((f) => env[f.env]).length
  let testOk: boolean | null = null
  let testMessage = ''
  if (prov.testFn && configured === required.length) {
    const fnName = `test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests
    const fn = tests[fnName]
    if (typeof fn === 'function') {
      try {
        const r = await fn(env)
        testOk = r.ok
        testMessage = r.message
      } catch (e) {
        testOk = false
        testMessage = e instanceof Error ? e.message : 'unknown'
      }
    }
  }
  const last = lastRotation(prov.id)
  const staleDays = last ? daysSince(last.ts) : null
  return { configured, total: required.length, testOk, testMessage, staleDays, lastRotationTs: last?.ts ?? null }
}

const server = createServer(async (req, res) => {
  // CORS: localhost only — no need for actual headers, browser enforces same-origin since we're on 127.0.0.1
  res.setHeader('Cache-Control', 'no-store')

  // UI HTML (no auth, must be loadable)
  if (req.method === 'GET' && (req.url === '/' || req.url?.startsWith('/?'))) {
    if (!existsSync(HTML_PATH)) {
      res.writeHead(500); res.end('UI HTML missing'); return
    }
    let html = readFileSync(HTML_PATH, 'utf-8')
    html = html.replace('__SESSION_TOKEN__', SESSION_TOKEN)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html); return
  }

  // All API endpoints require token
  if (!checkAuth(req)) { json(res, 401, { error: 'unauthorized' }); return }

  const url = new URL(req.url ?? '/', 'http://x')

  // GET /api/overview — providers + status
  if (req.method === 'GET' && url.pathname === '/api/overview') {
    const env = readEnvLocal()
    const vctx = getVercelCtx()
    const items = await Promise.all(
      PROVIDERS.map(async (prov) => ({
        id: prov.id, name: prov.name, category: prov.category,
        categoryLabel: CATEGORY_LABELS[prov.category] ?? prov.category,
        categoryMeta: CATEGORY_META[prov.category] ?? null,
        dashboardUrl: prov.dashboardUrl, rotateUrl: prov.rotateUrl, docsUrl: prov.docsUrl,
        rotateMaxAgeDays: prov.rotateMaxAgeDays,
        rotateInstructions: prov.rotateInstructions,
        fields: prov.fields.map((f) => ({
          env: f.env, label: f.label, sensitive: f.sensitive, optional: !!f.optional,
          present: !!env[f.env], masked: f.sensitive ? maskValue(env[f.env]) : (env[f.env] ?? null),
        })),
        status: await statusFor(prov, env),
      }))
    )
    json(res, 200, { vercelLinked: !!vctx, providers: items })
    return
  }

  // POST /api/test/:id — live test
  if (req.method === 'POST' && url.pathname.startsWith('/api/test/')) {
    const id = url.pathname.replace('/api/test/', '')
    const prov = PROVIDERS.find((p) => p.id === id)
    if (!prov || !prov.testFn) { json(res, 400, { error: 'no_test' }); return }
    const env = readEnvLocal()
    const fnName = `test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests
    const fn = tests[fnName]
    if (typeof fn !== 'function') { json(res, 400, { error: 'no_test_fn' }); return }
    try {
      const r = await fn(env)
      json(res, 200, r)
    } catch (e) {
      json(res, 200, { ok: false, message: e instanceof Error ? e.message : 'unknown' })
    }
    return
  }

  // POST /api/rotate/:id — body { values: { ENV: 'value', ... }, redeploy: bool }
  if (req.method === 'POST' && url.pathname.startsWith('/api/rotate/')) {
    const id = url.pathname.replace('/api/rotate/', '')
    const prov = PROVIDERS.find((p) => p.id === id)
    if (!prov) { json(res, 404, { error: 'unknown_provider' }); return }
    let body: { values?: Record<string, string>; redeploy?: boolean; autoGenerate?: boolean }
    try {
      body = JSON.parse(await readBody(req))
    } catch { json(res, 400, { error: 'invalid_json' }); return }

    let updates: Record<string, string> = {}

    if (body.autoGenerate && (prov.id === 'cron' || prov.id === 'jwt')) {
      const field = prov.fields[0]!
      updates[field.env] = randomBytes(32).toString('hex')
    } else if (body.values) {
      const allowedEnvs = new Set(prov.fields.map((f) => f.env))
      for (const [k, v] of Object.entries(body.values)) {
        if (allowedEnvs.has(k) && typeof v === 'string' && v.length > 0) updates[k] = v
      }
    }

    if (Object.keys(updates).length === 0) {
      json(res, 400, { error: 'no_updates' }); return
    }

    // Test pre-persist
    let preTest: { ok: boolean; message: string } | null = null
    if (prov.testFn) {
      const env = { ...readEnvLocal(), ...updates }
      const fnName = `test${prov.testFn[0]!.toUpperCase()}${prov.testFn.slice(1)}` as keyof typeof tests
      const fn = tests[fnName]
      if (typeof fn === 'function') {
        try { preTest = await fn(env) } catch (e) {
          preTest = { ok: false, message: e instanceof Error ? e.message : 'unknown' }
        }
      }
    }

    // Persist .env.local
    let envLocalOk = true
    try { updateEnvLocal(updates) } catch { envLocalOk = false }

    // Persist Vercel
    let vercelOk: boolean | null = null
    const vctx = getVercelCtx()
    if (vctx) {
      vercelOk = true
      for (const [k, v] of Object.entries(updates)) {
        const r = await upsertVercelEnv(k, v)
        if (!r.ok) vercelOk = false
      }
    }

    let redeployUrl: string | null = null
    if (body.redeploy && vercelOk) {
      redeployUrl = await triggerRedeploy()
    }

    logRotation({
      ts: '', provider: prov.id, action: 'rotate',
      fields: Object.keys(updates), envLocalOk, vercelOk: vercelOk ?? false,
    })

    json(res, 200, {
      ok: envLocalOk && (vercelOk === null || vercelOk === true),
      envLocalOk, vercelOk, preTest, redeployUrl,
      generatedSecret: body.autoGenerate ? maskValue(Object.values(updates)[0]) : null,
    })
    return
  }

  // POST /api/open — body { url } — opens dashboard URL on host
  if (req.method === 'POST' && url.pathname === '/api/open') {
    let body: { url?: string }
    try { body = JSON.parse(await readBody(req)) } catch { json(res, 400, { error: 'invalid_json' }); return }
    if (!body.url || !/^https?:\/\//.test(body.url)) { json(res, 400, { error: 'invalid_url' }); return }
    exec(`open "${body.url.replace(/"/g, '\\"')}"`)
    json(res, 200, { ok: true }); return
  }

  // GET /api/diff — Vercel ↔ local
  if (req.method === 'GET' && url.pathname === '/api/diff') {
    const local = readEnvLocal()
    const vEnvs = await listVercelEnvs()
    const allKeys = new Set<string>([
      ...Object.keys(local),
      ...vEnvs.map((e) => e.key),
    ])
    const rows = [...allKeys].sort().map((key) => {
      const inLocal = !!local[key]
      const targets = vEnvs.filter((e) => e.key === key).flatMap((e) => e.target)
      const inProd = targets.includes('production')
      const inPreview = targets.includes('preview')
      const inDev = targets.includes('development')
      return { key, inLocal, inProd, inPreview, inDev }
    })
    json(res, 200, { rows })
    return
  }

  json(res, 404, { error: 'not_found' })
})

const PORT = 0 // OS-assigned random port for security
server.listen(PORT, '127.0.0.1', () => {
  const addr = server.address()
  if (!addr || typeof addr === 'string') return
  const url = `http://127.0.0.1:${addr.port}/?t=${SESSION_TOKEN}`
  console.log(`\n  TouraCore Secrets GUI`)
  console.log(`  ─────────────────────`)
  console.log(`  ${url}\n`)
  console.log(`  Token-protected · loopback only · close terminal to stop\n`)
  // Auto-open
  exec(`open "${url}"`)
})
