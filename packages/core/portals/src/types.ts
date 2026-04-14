import { z } from 'zod';

export type PortalStatus = 'draft' | 'active' | 'archived';

export interface Portal {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  agency_id: string | null;
  settings: Record<string, unknown>;
  seo: PortalSeo;
  status: PortalStatus;
  created_at: string;
  updated_at: string;
}

export interface PortalSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  og_image?: string;
  canonical_base?: string;
  schema_type?: string;
}

export interface PortalTenant {
  portal_id: string;
  tenant_id: string;
  sort_order: number;
  featured: boolean;
}

export interface PortalWithTenants extends Portal {
  tenants: PortalTenant[];
}

export const CreatePortalSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Solo lettere minuscole, numeri e trattini'),
  name: z.string().min(1).max(200),
  domain: z.string().max(255).optional(),
  agency_id: z.string().uuid().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  seo: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    keywords: z.array(z.string()).optional(),
    og_image: z.string().url().optional(),
  }).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export type CreatePortalInput = z.infer<typeof CreatePortalSchema>;

export const UpdatePortalSchema = CreatePortalSchema.partial().omit({ slug: true });
export type UpdatePortalInput = z.infer<typeof UpdatePortalSchema>;

export const PortalTenantSchema = z.object({
  portal_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  sort_order: z.number().int().default(0),
  featured: z.boolean().default(false),
});

export type PortalTenantInput = z.infer<typeof PortalTenantSchema>;
