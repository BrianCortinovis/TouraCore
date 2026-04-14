export {
  createPortal,
  getPortalBySlug,
  getPortalById,
  listPortals,
  updatePortal,
  deletePortal,
  addTenantToPortal,
  removeTenantFromPortal,
  getPortalTenants,
} from './queries';
export type {
  Portal,
  PortalSeo,
  PortalTenant,
  PortalWithTenants,
  PortalStatus,
  CreatePortalInput,
  UpdatePortalInput,
  PortalTenantInput,
} from './types';
export {
  CreatePortalSchema,
  UpdatePortalSchema,
  PortalTenantSchema,
} from './types';
