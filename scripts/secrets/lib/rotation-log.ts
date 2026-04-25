import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOG_PATH = resolve(process.cwd(), '.secrets-rotations.log')

interface RotationEntry {
  ts: string
  provider: string
  action: 'rotate' | 'create' | 'test' | 'skip'
  fields: string[]
  vercelOk?: boolean
  envLocalOk?: boolean
}

export function logRotation(entry: RotationEntry): void {
  const line = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n'
  appendFileSync(LOG_PATH, line, 'utf-8')
}

export function lastRotation(providerId: string): RotationEntry | null {
  if (!existsSync(LOG_PATH)) return null
  const lines = readFileSync(LOG_PATH, 'utf-8').trim().split('\n').reverse()
  for (const line of lines) {
    if (!line) continue
    try {
      const e = JSON.parse(line) as RotationEntry
      if (e.provider === providerId && e.action === 'rotate') return e
    } catch { /* skip */ }
  }
  return null
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export function ensureGitignore(): void {
  const gi = resolve(process.cwd(), '.gitignore')
  const ignoredPatterns = ['.secrets-rotations.log', '.secrets-backup/', 'apps/web/.env.local.bak.*']
  let content = existsSync(gi) ? readFileSync(gi, 'utf-8') : ''
  let modified = false
  for (const p of ignoredPatterns) {
    if (!content.includes(p)) {
      content += (content.endsWith('\n') ? '' : '\n') + p + '\n'
      modified = true
    }
  }
  if (modified) writeFileSync(gi, content, 'utf-8')
}
