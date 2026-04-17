'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const ConfigureSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  provider: z.enum(['thefork', 'google_reserve', 'opentable', 'rt_fiscal_it', 'printer_kitchen', 'deliveroo', 'justeat']),
  config: z.record(z.string(), z.string()),
  isActive: z.boolean().default(true),
})

const TestSchema = z.object({
  integrationId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/integrations`
}

export async function configureIntegration(input: z.infer<typeof ConfigureSchema>) {
  const parsed = ConfigureSchema.parse(input)
  const admin = await createServiceRoleClient()

  // Encrypt config (placeholder: in produzione AES-256-GCM via @touracore/security)
  const configEncrypted = Buffer.from(JSON.stringify(parsed.config)).toString('base64')

  await admin.from('restaurant_integrations').upsert(
    {
      restaurant_id: parsed.restaurantId,
      provider: parsed.provider,
      config_encrypted: configEncrypted,
      is_active: parsed.isActive,
    },
    { onConflict: 'restaurant_id,provider' },
  )

  revalidatePath(pathFor(parsed))
}

export async function testIntegration(input: z.infer<typeof TestSchema>) {
  const parsed = TestSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: integration } = await admin
    .from('restaurant_integrations')
    .select('id, provider, config_encrypted')
    .eq('id', parsed.integrationId)
    .single()
  if (!integration) throw new Error('Integration not found')

  // Test stub per provider
  let status: 'ok' | 'error' = 'ok'
  let message = 'Connessione OK (mock)'
  try {
    if (integration.provider === 'thefork') {
      // Placeholder: ping API TheFork sandbox
      message = 'TheFork sandbox: 200 OK (stub)'
    } else if (integration.provider === 'google_reserve') {
      message = 'Google Reserve feed validated (stub)'
    } else if (integration.provider === 'rt_fiscal_it') {
      message = 'RT printer reachable (stub TCP 9100)'
    }
  } catch (e) {
    status = 'error'
    message = e instanceof Error ? e.message : 'Errore'
  }

  await admin.from('restaurant_integrations').update({
    last_sync_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_error: status === 'error' ? message : null,
  }).eq('id', integration.id)

  await admin.from('integration_sync_log').insert({
    integration_id: integration.id,
    direction: 'outbound',
    payload: { test: true },
    status,
    message,
  })

  revalidatePath(pathFor(parsed))
  return { status, message }
}
