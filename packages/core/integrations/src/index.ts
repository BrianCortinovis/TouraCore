export type {
  IntegrationScope,
  IntegrationStatus,
  IntegrationProvider,
  IntegrationCredentials,
  IntegrationFieldType,
  IntegrationFieldDef,
  IntegrationProviderDef,
  IntegrationCredentialsInput,
} from './types'

export {
  getProviderDef,
  getProvidersForScope,
  getAllProviders,
  integrationCredentialsSchema,
} from './registry'

// Nota: crypto, queries e actions NON sono riesportate dall'index per evitare
// che un client component che importa `getProvidersForScope` (registry) trascini
// `next/headers` nel bundle browser. Usa `@touracore/integrations/queries`,
// `@touracore/integrations/actions`, `@touracore/integrations/crypto` direttamente.
export type { ActionResult } from './actions'
