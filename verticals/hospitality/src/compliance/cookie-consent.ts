/**
 * Cookie Consent Management
 *
 * Implements cookie consent management for GDPR/ePrivacy compliance in
 * accordance with:
 * - GDPR (Regolamento UE 2016/679) — Art. 7 (conditions for consent)
 * - Direttiva ePrivacy 2002/58/CE (Cookie Directive) — Art. 5(3)
 * - D.Lgs. 196/2003 (Codice Privacy) — Art. 122 (cookie e tracciamento)
 * - Provvedimento Garante Privacy 10/06/2021 — "Linee guida cookie e
 *   altri strumenti di tracciamento" (Registro dei provvedimenti n. 231)
 *
 * The Provvedimento 10/06/2021 requires:
 * 1. Cookie banner on first visit with accept/reject options of equal prominence
 * 2. Granular consent per category (technical, analytics, profiling/marketing)
 * 3. Technical cookies may be set without consent (Art. 122(1) Codice Privacy)
 * 4. Consent must be recorded and auditable
 * 5. Consent must be renewable (suggested period: 6 months)
 * 6. Scroll or continued navigation does NOT constitute valid consent
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

export interface CookiePreferences {
  necessary: true
  analytics: boolean
  marketing: boolean
}

export interface CookieDefinition {
  name: string
  category: CookieCategory
  purpose: string
  provider: string
  duration: string
  type: 'cookie' | 'local_storage'
}

export interface CookieConsentRecord {
  session_id: string
  timestamp: string
  preferences: CookiePreferences
  consent_version: string
  ip_address: string | null
  user_agent: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Current version of the cookie consent policy.
 *
 * Increment this version whenever the cookie inventory, consent categories,
 * or consent mechanism changes. A version change should trigger a renewed
 * consent request to all users, per Provvedimento Garante 10/06/2021
 * Section 7 (aggiornamento del consenso).
 */
export const COOKIE_CONSENT_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Cookie inventory
// ---------------------------------------------------------------------------

/**
 * Complete inventory of cookies and local storage items used by the
 * application, as required by Provvedimento Garante 10/06/2021 Section 4.
 *
 * The Garante requires the cookie banner and extended cookie policy to list
 * every cookie/tracker, its purpose, provider, duration, and whether it is
 * first-party or third-party.
 *
 * Technical/necessary cookies (Art. 122(1) Codice Privacy) do not require
 * consent but must still be disclosed in the cookie policy.
 */
export const COOKIE_INVENTORY: CookieDefinition[] = [
  // ----- Necessary cookies (no consent required) -----
  {
    name: 'gest_cookie_consent',
    category: 'necessary',
    purpose:
      'Memorizza le preferenze di consenso cookie dell\'utente. ' +
      'Necessario per rispettare le scelte espresse dall\'utente.',
    provider: 'Gest (prima parte)',
    duration: '6 mesi',
    type: 'cookie',
  },
  {
    name: 'sb-*-auth-token',
    category: 'necessary',
    purpose:
      'Token di autenticazione Supabase. Necessario per mantenere la ' +
      'sessione utente autenticata e garantire la sicurezza dell\'accesso.',
    provider: 'Supabase (prima parte)',
    duration: 'Sessione / refresh token fino a scadenza',
    type: 'cookie',
  },
  {
    name: 'sb-*-auth-token-code-verifier',
    category: 'necessary',
    purpose:
      'Verifier PKCE per il flusso di autenticazione Supabase. Necessario ' +
      'per la sicurezza del processo di login (protezione CSRF).',
    provider: 'Supabase (prima parte)',
    duration: 'Sessione',
    type: 'cookie',
  },
  {
    name: 'supabase.auth.token',
    category: 'necessary',
    purpose:
      'Dati della sessione di autenticazione Supabase memorizzati nel ' +
      'browser. Necessario per il mantenimento della sessione lato client.',
    provider: 'Supabase (prima parte)',
    duration: 'Sessione',
    type: 'local_storage',
  },

  // ----- Marketing cookies (Stripe — consent required) -----
  {
    name: '__stripe_mid',
    category: 'marketing',
    purpose:
      'Identificatore Stripe per il rilevamento delle frodi e ' +
      'l\'attribuzione delle conversioni sui pagamenti.',
    provider: 'Stripe (terza parte)',
    duration: '1 anno',
    type: 'cookie',
  },
  {
    name: '__stripe_sid',
    category: 'marketing',
    purpose:
      'Identificatore di sessione Stripe per il rilevamento delle frodi ' +
      'durante il processo di pagamento.',
    provider: 'Stripe (terza parte)',
    duration: '30 minuti',
    type: 'cookie',
  },
]

// ---------------------------------------------------------------------------
// Default preferences
// ---------------------------------------------------------------------------

/**
 * Generate the default cookie consent preferences.
 *
 * Per Provvedimento Garante 10/06/2021 Section 5, the default state must
 * have all non-necessary cookies disabled (opt-in model). Only technical
 * cookies strictly necessary for the functioning of the service are
 * enabled by default, as permitted by Art. 122(1) D.Lgs. 196/2003.
 *
 * The `necessary` field is always `true` and cannot be toggled by the user.
 */
export function generateDefaultPreferences(): CookiePreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
  }
}

// ---------------------------------------------------------------------------
// Consent record
// ---------------------------------------------------------------------------

/**
 * Build an immutable consent record suitable for persistent storage.
 *
 * Per GDPR Art. 7(1), the data controller must be able to demonstrate that
 * the data subject has given consent. This function creates an auditable
 * record capturing:
 * - The session identifier (to link the consent to a browsing session)
 * - An ISO 8601 timestamp
 * - The exact preferences granted or denied
 * - The version of the cookie policy at the time of consent
 * - The IP address and user agent (for proof of consent, where available)
 *
 * The IP address is stored in accordance with Provvedimento Garante
 * 10/06/2021 Section 7, which requires the controller to be able to prove
 * that consent was freely given. IP and user agent are retained solely for
 * this evidentiary purpose and are subject to the same retention periods
 * as the consent record itself.
 */
export function buildConsentRecord(
  sessionId: string,
  preferences: CookiePreferences,
  version: string,
  ipAddress?: string,
  userAgent?: string,
): CookieConsentRecord {
  return {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    preferences: {
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    },
    consent_version: version,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  }
}
