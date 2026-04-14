import type { z } from 'zod'
import type { integrationCredentialsSchema } from './registry'

export type IntegrationScope = 'tenant' | 'agency' | 'entity'

export type IntegrationStatus = 'not_configured' | 'configured' | 'error'

export type IntegrationProvider =
  | 'octorate'
  | 'resend'
  | 'whatsapp_business'
  | 'stripe_connect'
  | 'booking_ical'
  | 'airbnb_ical'

export interface IntegrationCredentials {
  id: string
  scope: IntegrationScope
  scope_id: string
  provider: IntegrationProvider
  credentials_encrypted: string
  config: Record<string, unknown>
  status: IntegrationStatus
  last_sync_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export type IntegrationFieldType = 'text' | 'password' | 'email' | 'url' | 'jsonb'

export interface IntegrationFieldDef {
  key: string
  label: string
  type: IntegrationFieldType
  placeholder?: string
  required: boolean
  help?: string
}

export interface IntegrationProviderDef {
  provider: IntegrationProvider
  label: string
  description: string
  icon: string
  allowedScopes: IntegrationScope[]
  fields: IntegrationFieldDef[]
}

export type IntegrationCredentialsInput = z.infer<typeof integrationCredentialsSchema>
