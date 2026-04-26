// Boot-time env validation. Importa questo file da ogni route handler critico
// per fail-fast quando una env mancante o malformata si nasconde.
//
// Uso:
//   import { env } from '@/env'
//   const stripeKey = env.STRIPE_SECRET_KEY
//
// Per usare env opzionali, accedere via process.env direttamente — non passare per env.

import { z } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'

// In dev mantengo permissivo (warning console). In prod tutto required diventa hard fail.
const requiredInProd = (schema: z.ZodString) =>
  isProduction ? schema.min(1) : schema.optional().default('__dev_fallback__')

const ServerEnvSchema = z.object({
  // Supabase (always required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // Stripe (required in prod for billing flows)
  STRIPE_SECRET_KEY: requiredInProd(z.string().startsWith('sk_')),
  STRIPE_WEBHOOK_SECRET: requiredInProd(z.string().startsWith('whsec_')),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),

  // Cron + secrets isolation (required in prod)
  CRON_SECRET: requiredInProd(z.string().min(32)),
  MAGIC_LINK_SECRET: requiredInProd(z.string().min(32)),
  VOUCHER_JWT_SECRET: requiredInProd(z.string().min(32)),
  INTEGRATIONS_ENCRYPTION_KEY: requiredInProd(z.string().min(32)),

  // Email (required in prod)
  RESEND_API_KEY: requiredInProd(z.string().startsWith('re_')),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // R2 storage
  R2_ACCOUNT_ID: requiredInProd(z.string().min(1)),
  R2_ACCESS_KEY_ID: requiredInProd(z.string().min(1)),
  R2_SECRET_ACCESS_KEY: requiredInProd(z.string().min(1)),
  R2_BUCKET_NAME: requiredInProd(z.string().min(1)),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Public URLs (required in prod)
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Optional integrations
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  THEFORK_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_RESERVE_WEBHOOK_SECRET: z.string().optional(),
  OCTORATE_API_BASE: z.string().url().optional(),

  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
})

type ServerEnv = z.infer<typeof ServerEnvSchema>

let _env: ServerEnv | null = null

function parseEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ')
    if (isProduction) {
      throw new Error(`Invalid environment configuration in production:\n  ${issues}`)
    }
    console.warn(`[env] Some env vars are invalid (dev mode, continuing):\n  ${issues}`)
  }
  return parsed.success ? parsed.data : (process.env as unknown as ServerEnv)
}

export const env: ServerEnv = (() => {
  if (!_env) _env = parseEnv()
  return _env
})()
