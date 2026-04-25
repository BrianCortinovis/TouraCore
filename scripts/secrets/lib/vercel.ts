import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const TOKEN_PATH = resolve(homedir(), 'Library/Application Support/com.vercel.cli/auth.json')
const PROJECT_PATH = resolve(process.cwd(), 'apps/web/.vercel/project.json')

interface VercelCtx {
  token: string
  projectId: string
  teamId: string
}

export function getVercelCtx(): VercelCtx | null {
  if (!existsSync(TOKEN_PATH) || !existsSync(PROJECT_PATH)) return null
  try {
    const auth = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'))
    const proj = JSON.parse(readFileSync(PROJECT_PATH, 'utf-8'))
    if (!auth.token || !proj.projectId || !proj.orgId) return null
    return { token: auth.token, projectId: proj.projectId, teamId: proj.orgId }
  } catch {
    return null
  }
}

interface VercelEnv {
  id: string
  key: string
  target: string[]
  type: string
  createdAt: number
  updatedAt: number
}

export async function listVercelEnvs(): Promise<VercelEnv[]> {
  const ctx = getVercelCtx()
  if (!ctx) return []
  const r = await fetch(
    `https://api.vercel.com/v9/projects/${ctx.projectId}/env?teamId=${ctx.teamId}&decrypt=false`,
    { headers: { Authorization: `Bearer ${ctx.token}` } }
  )
  if (!r.ok) return []
  const data = await r.json()
  return data.envs ?? []
}

export async function deleteVercelEnv(id: string): Promise<boolean> {
  const ctx = getVercelCtx()
  if (!ctx) return false
  const r = await fetch(
    `https://api.vercel.com/v9/projects/${ctx.projectId}/env/${id}?teamId=${ctx.teamId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.token}` } }
  )
  return r.ok
}

export async function createVercelEnv(
  key: string,
  value: string,
  targets: ('production' | 'preview' | 'development')[]
): Promise<boolean> {
  const ctx = getVercelCtx()
  if (!ctx) return false
  const r = await fetch(
    `https://api.vercel.com/v10/projects/${ctx.projectId}/env?teamId=${ctx.teamId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, type: 'encrypted', target: targets }),
    }
  )
  return r.ok
}

export async function upsertVercelEnv(
  key: string,
  value: string,
  targets: ('production' | 'preview' | 'development')[] = ['production', 'preview', 'development']
): Promise<{ ok: boolean; created: number; deleted: number }> {
  const existing = await listVercelEnvs()
  const matches = existing.filter((e) => e.key === key)
  let deleted = 0
  for (const m of matches) {
    if (await deleteVercelEnv(m.id)) deleted++
  }
  const ok = await createVercelEnv(key, value, targets)
  return { ok, created: ok ? 1 : 0, deleted }
}

export async function triggerRedeploy(): Promise<string | null> {
  const ctx = getVercelCtx()
  if (!ctx) return null
  const list = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${ctx.projectId}&target=production&limit=1&teamId=${ctx.teamId}`,
    { headers: { Authorization: `Bearer ${ctx.token}` } }
  )
  if (!list.ok) return null
  const data = await list.json()
  const latest = data.deployments?.[0]?.uid
  if (!latest) return null

  const r = await fetch(`https://api.vercel.com/v13/deployments?teamId=${ctx.teamId}&forceNew=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'touracore', deploymentId: latest, target: 'production' }),
  })
  if (!r.ok) return null
  const dep = await r.json()
  return dep.url ?? null
}
