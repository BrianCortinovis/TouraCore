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

export {
  encryptCredentials,
  decryptCredentials,
} from './crypto'

export {
  getIntegration,
  resolveIntegration,
  listIntegrationsForScope,
} from './queries'

export {
  saveIntegrationAction,
  deleteIntegrationAction,
  testConnectionAction,
  loadIntegrationAction,
  type ActionResult,
} from './actions'
