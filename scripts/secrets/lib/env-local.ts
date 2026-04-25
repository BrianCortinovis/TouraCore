import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_PATH = resolve(process.cwd(), 'apps/web/.env.local')

export function readEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {}
  const content = readFileSync(ENV_PATH, 'utf-8')
  const out: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && m[1] && m[2] !== undefined) {
      out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}

export function updateEnvLocal(updates: Record<string, string>): void {
  if (!existsSync(ENV_PATH)) {
    writeFileSync(ENV_PATH, '', 'utf-8')
  }
  // Backup
  const backupPath = ENV_PATH + '.bak.' + Date.now()
  copyFileSync(ENV_PATH, backupPath)

  let content = readFileSync(ENV_PATH, 'utf-8')
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    const line = `${key}=${value}`
    if (regex.test(content)) {
      content = content.replace(regex, line)
    } else {
      content = content.trimEnd() + `\n${line}\n`
    }
  }
  writeFileSync(ENV_PATH, content, 'utf-8')
}

export function maskValue(v: string | undefined): string {
  if (!v) return '—'
  if (v.length <= 8) return '••••••'
  return v.slice(0, 4) + '••••' + v.slice(-4)
}
