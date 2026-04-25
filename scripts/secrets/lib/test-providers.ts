// Live status check per provider — no values logged

export interface TestResult {
  ok: boolean
  message: string
}

export async function testR2(env: Record<string, string>): Promise<TestResult> {
  const account = env['R2_ACCOUNT_ID']
  const key = env['R2_ACCESS_KEY_ID']
  const secret = env['R2_SECRET_ACCESS_KEY']
  const bucket = env['R2_BUCKET']
  if (!account || !key || !secret || !bucket) return { ok: false, message: 'env mancanti' }

  try {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3')
    // Account ID puo' contenere region suffix tipo "abc123.eu" — usalo cosi' nell'endpoint
    const c = new S3Client({
      region: 'auto',
      endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: key, secretAccessKey: secret },
      forcePathStyle: false,
    })
    await c.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }))
    return { ok: true, message: `bucket "${bucket}" ok` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function testSupabase(env: Record<string, string>): Promise<TestResult> {
  const url = env['NEXT_PUBLIC_SUPABASE_URL']
  const srk = env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !srk) return { ok: false, message: 'env mancanti' }
  try {
    const r = await fetch(`${url}/rest/v1/tenants?limit=1`, {
      headers: { apikey: srk, Authorization: `Bearer ${srk}` },
    })
    if (r.ok) return { ok: true, message: 'service_role attivo' }
    return { ok: false, message: `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function testResend(env: Record<string, string>): Promise<TestResult> {
  const key = env['RESEND_API_KEY']
  if (!key) return { ok: false, message: 'env mancante' }
  try {
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (r.ok) return { ok: true, message: 'API key attiva' }
    return { ok: false, message: `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function testStripe(env: Record<string, string>): Promise<TestResult> {
  const key = env['STRIPE_SECRET_KEY']
  if (!key) return { ok: false, message: 'env mancante' }
  try {
    const r = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (r.ok) return { ok: true, message: 'API key attiva' }
    return { ok: false, message: `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function testCronSecret(env: Record<string, string>): Promise<TestResult> {
  const s = env['CRON_SECRET']
  if (!s) return { ok: false, message: 'CRON_SECRET non impostato' }
  if (s.length < 32) return { ok: false, message: 'troppo corto (<32 char), debole' }
  return { ok: true, message: `lungo ${s.length} char` }
}

export async function testEncryption(env: Record<string, string>): Promise<TestResult> {
  const k = env['ENCRYPTION_KEY']
  if (!k) return { ok: false, message: 'ENCRYPTION_KEY mancante' }
  // Accept hex 64 char OR base64 32-byte (44 char con padding)
  const hexOk = /^[0-9a-fA-F]{64}$/.test(k)
  const b64Ok = /^[A-Za-z0-9+/]{43}=$/.test(k) || /^[A-Za-z0-9+/]{44}$/.test(k)
  if (!hexOk && !b64Ok) {
    return { ok: false, message: `formato non valido (${k.length} char, atteso hex 64 o base64 44)` }
  }
  return { ok: true, message: `AES-256 key (${hexOk ? 'hex' : 'base64'})` }
}
