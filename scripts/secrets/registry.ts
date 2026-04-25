// Registry providers — definisce quali credenziali esistono, dove ruotare, env names.
// NESSUN VALORE QUI. Solo metadati. Committable.

export interface SecretField {
  env: string
  label: string
  sensitive: boolean
  optional?: boolean
}

export interface ProviderDef {
  id: string
  name: string
  category: 'storage' | 'auth' | 'payments' | 'email' | 'observability' | 'security' | 'integrations'
  dashboardUrl: string
  rotateUrl?: string
  docsUrl?: string
  fields: SecretField[]
  testFn?: 'r2' | 'supabase' | 'resend' | 'stripe' | 'cronSecret' | 'encryption'
  rotateInstructions: string[]
  rotateMaxAgeDays?: number
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'r2',
    name: 'Cloudflare R2 — Media Storage',
    category: 'storage',
    dashboardUrl: 'https://dash.cloudflare.com/?to=/:account/r2/overview',
    rotateUrl: 'https://dash.cloudflare.com/?to=/:account/r2/api-tokens',
    docsUrl: 'https://developers.cloudflare.com/r2/api/s3/tokens/',
    fields: [
      { env: 'R2_ACCOUNT_ID', label: 'Account ID', sensitive: false },
      { env: 'R2_ACCESS_KEY_ID', label: 'Access Key ID', sensitive: true },
      { env: 'R2_SECRET_ACCESS_KEY', label: 'Secret Access Key', sensitive: true },
      { env: 'R2_BUCKET', label: 'Bucket name', sensitive: false },
      { env: 'R2_PUBLIC_URL', label: 'Public URL', sensitive: false },
    ],
    testFn: 'r2',
    rotateInstructions: [
      'Apri dashboard Cloudflare R2',
      'Vai su "Manage R2 API Tokens"',
      'Crea nuovo token (Object Read & Write, scope al bucket)',
      'Copia Access Key ID + Secret',
      'Incolla qui i nuovi valori — old keys restano attive 24h',
      'Dopo conferma, revoca il vecchio token dalla dashboard',
    ],
    rotateMaxAgeDays: 365,
  },
  {
    id: 'supabase',
    name: 'Supabase — Database + Auth',
    category: 'auth',
    dashboardUrl: 'https://supabase.com/dashboard/project/dysnrgnqzliodqrsohoz/settings/api',
    rotateUrl: 'https://supabase.com/dashboard/project/dysnrgnqzliodqrsohoz/settings/api',
    docsUrl: 'https://supabase.com/docs/guides/api/api-keys',
    fields: [
      { env: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Project URL', sensitive: false },
      { env: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Anon (public) key', sensitive: false },
      { env: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Service role key', sensitive: true },
      { env: 'SUPABASE_ACCESS_TOKEN', label: 'Management API token', sensitive: true },
      { env: 'DATABASE_URL', label: 'Postgres direct connection URL', sensitive: true },
    ],
    testFn: 'supabase',
    rotateInstructions: [
      'Apri Supabase → Project Settings → API',
      'Click "Reset" su anon o service_role key (secondo cosa ruoti)',
      'Copia il nuovo valore',
      'Per Management API token: vai su account.supabase.com/account/tokens',
      'Conferma qui — Vercel + .env.local aggiornati atomic',
      'Verifica deploy production funzioni dopo rotation',
    ],
    rotateMaxAgeDays: 180,
  },
  {
    id: 'resend',
    name: 'Resend — Transactional Email',
    category: 'email',
    dashboardUrl: 'https://resend.com/api-keys',
    rotateUrl: 'https://resend.com/api-keys',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys',
    fields: [
      { env: 'RESEND_API_KEY', label: 'API Key', sensitive: true },
      { env: 'EMAIL_FROM', label: 'From email/domain', sensitive: false },
    ],
    testFn: 'resend',
    rotateInstructions: [
      'Apri https://resend.com/api-keys',
      'Crea nuova API key (full access o sending only)',
      'Copia il valore (visibile solo una volta!)',
      'Conferma qui',
      'Test email send dopo deploy',
      'Elimina vecchia key da dashboard',
    ],
    rotateMaxAgeDays: 180,
  },
  {
    id: 'stripe',
    name: 'Stripe — Payments + Connect',
    category: 'payments',
    dashboardUrl: 'https://dashboard.stripe.com/apikeys',
    rotateUrl: 'https://dashboard.stripe.com/apikeys',
    docsUrl: 'https://docs.stripe.com/keys',
    fields: [
      { env: 'STRIPE_SECRET_KEY', label: 'Secret key (sk_live_...)', sensitive: true },
      { env: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Publishable key', sensitive: false },
      { env: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook signing secret', sensitive: true },
    ],
    testFn: 'stripe',
    rotateInstructions: [
      'Apri Stripe Dashboard → Developers → API keys',
      'Click "Roll key" sulla secret key',
      'Configura periodo di overlap (24h)',
      'Copia nuovo sk_ + pk_',
      'Per webhook secret: Webhooks → endpoint → Signing secret → Roll',
      'Conferma qui — entro overlap window vecchia key resta attiva',
    ],
    rotateMaxAgeDays: 180,
  },
  {
    id: 'cron',
    name: 'Cron Secret — Internal API',
    category: 'security',
    dashboardUrl: '',
    rotateInstructions: [
      'Genero io un nuovo segreto random sicuro (32 byte hex)',
      'Aggiorno automaticamente Vercel + .env.local',
      'Cron job esistenti continuano a funzionare al prossimo run',
    ],
    fields: [{ env: 'CRON_SECRET', label: 'Cron HMAC secret', sensitive: true }],
    testFn: 'cronSecret',
    rotateMaxAgeDays: 90,
  },
  {
    id: 'encryption',
    name: 'Encryption Key — Integration credentials',
    category: 'security',
    dashboardUrl: '',
    rotateInstructions: [
      '⚠️  ATTENZIONE: rotation rompe credenziali integration esistenti (Octorate, Twilio, ecc.)',
      'Devi prima ri-encryptare tutti gli integrations con la nuova key',
      'Genero nuova key random 32 byte AES-256',
      'Trigger migration script per re-encrypt',
      'Aggiorno Vercel + .env.local',
    ],
    fields: [{ env: 'ENCRYPTION_KEY', label: 'AES-256-GCM key (32 byte hex)', sensitive: true }],
    testFn: 'encryption',
    rotateMaxAgeDays: 365,
  },
  {
    id: 'jwt',
    name: 'JWT Voucher Secret',
    category: 'security',
    dashboardUrl: '',
    rotateInstructions: [
      '⚠️  Rotation invalida voucher non riscattati esistenti',
      'Nuovo secret random 32 byte hex',
      'Aggiorno Vercel + .env.local',
    ],
    fields: [{ env: 'VOUCHER_JWT_SECRET', label: 'JWT signing secret', sensitive: true, optional: true }],
    rotateMaxAgeDays: 365,
  },
  {
    id: 'twilio',
    name: 'Twilio — SMS + WhatsApp',
    category: 'integrations',
    dashboardUrl: 'https://console.twilio.com/',
    rotateUrl: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
    fields: [
      { env: 'TWILIO_ACCOUNT_SID', label: 'Account SID', sensitive: false, optional: true },
      { env: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', sensitive: true, optional: true },
    ],
    rotateInstructions: [
      'Twilio Console → Account → API keys & tokens',
      'Click "Request new Auth Token"',
      'Copia nuovo token',
      'Conferma qui',
    ],
    rotateMaxAgeDays: 180,
  },
  {
    id: 'vercel',
    name: 'Vercel — Deployment platform',
    category: 'observability',
    dashboardUrl: 'https://vercel.com/account/tokens',
    rotateUrl: 'https://vercel.com/account/tokens',
    fields: [{ env: '__VERCEL_TOKEN_NOTE__', label: 'CLI token (in ~/Library/Application Support)', sensitive: true }],
    rotateInstructions: [
      'NON gestito da .env — è in CLI auth file local',
      'vercel logout && vercel login per refresh',
      'O crea token su vercel.com/account/tokens',
    ],
    rotateMaxAgeDays: 365,
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  storage: '🗄  Storage',
  auth: '🔐  Auth & DB',
  payments: '💳  Payments',
  email: '✉️  Email',
  observability: '📊  Observability',
  security: '🔑  Security',
  integrations: '🔌  Integrations',
}

export const CATEGORY_META: Record<string, { icon: string; title: string; description: string }> = {
  storage: {
    icon: '🗄',
    title: 'Storage',
    description: 'Bucket e CDN per asset, foto, file utenti e media tenant.',
  },
  auth: {
    icon: '🔐',
    title: 'Auth & Database',
    description: 'Database principale, autenticazione utenti, service-role keys.',
  },
  payments: {
    icon: '💳',
    title: 'Payments',
    description: 'Stripe e gateway pagamento — checkout, subscription, payout.',
  },
  email: {
    icon: '✉️',
    title: 'Email & Messaging',
    description: 'Email transazionali, marketing, notification triggers.',
  },
  security: {
    icon: '🔑',
    title: 'Security & Crypto',
    description: 'Encryption keys, JWT secrets, cron HMAC — secrets generati internamente.',
  },
  integrations: {
    icon: '🔌',
    title: 'Integrations',
    description: 'API esterne: Twilio, OTA channels, CRM, distribution.',
  },
  observability: {
    icon: '📊',
    title: 'Platform & Deploy',
    description: 'Vercel deployment, monitoring, logs, infrastructure tools.',
  },
}
