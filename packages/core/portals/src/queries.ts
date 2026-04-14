import type { SupabaseClient } from '@supabase/supabase-js';
import type { Portal, PortalTenant, PortalWithTenants, CreatePortalInput, UpdatePortalInput } from './types';

export async function createPortal(
  supabase: SupabaseClient,
  input: CreatePortalInput
): Promise<Portal> {
  const { data, error } = await supabase
    .from('portals')
    .insert({
      slug: input.slug,
      name: input.name,
      domain: input.domain ?? null,
      agency_id: input.agency_id ?? null,
      settings: input.settings ?? {},
      seo: input.seo ?? {},
      status: input.status,
    })
    .select()
    .single();

  if (error) throw new Error(`Errore creazione portale: ${error.message}`);
  return data as Portal;
}

export async function getPortalBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PortalWithTenants | null> {
  const { data: portal, error } = await supabase
    .from('portals')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore query portale: ${error.message}`);
  }

  const { data: tenants } = await supabase
    .from('portal_tenants')
    .select('*')
    .eq('portal_id', (portal as Portal).id)
    .order('sort_order');

  return {
    ...(portal as Portal),
    tenants: (tenants ?? []) as PortalTenant[],
  };
}

export async function getPortalById(
  supabase: SupabaseClient,
  id: string
): Promise<Portal | null> {
  const { data, error } = await supabase
    .from('portals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore query portale: ${error.message}`);
  }
  return data as Portal;
}

export async function listPortals(
  supabase: SupabaseClient,
  options?: { status?: string; agencyId?: string }
): Promise<Portal[]> {
  let query = supabase
    .from('portals')
    .select('*')
    .order('name');

  if (options?.status) query = query.eq('status', options.status);
  if (options?.agencyId) query = query.eq('agency_id', options.agencyId);

  const { data, error } = await query;
  if (error) throw new Error(`Errore lista portali: ${error.message}`);
  return (data ?? []) as Portal[];
}

export async function updatePortal(
  supabase: SupabaseClient,
  id: string,
  input: UpdatePortalInput
): Promise<Portal> {
  const { data, error } = await supabase
    .from('portals')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Errore aggiornamento portale: ${error.message}`);
  return data as Portal;
}

export async function deletePortal(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('portals')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Errore eliminazione portale: ${error.message}`);
}

export async function addTenantToPortal(
  supabase: SupabaseClient,
  portalId: string,
  tenantId: string,
  sortOrder = 0,
  featured = false
): Promise<void> {
  const { error } = await supabase
    .from('portal_tenants')
    .upsert(
      { portal_id: portalId, tenant_id: tenantId, sort_order: sortOrder, featured },
      { onConflict: 'portal_id,tenant_id' }
    );

  if (error) throw new Error(`Errore associazione tenant-portale: ${error.message}`);
}

export async function removeTenantFromPortal(
  supabase: SupabaseClient,
  portalId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('portal_tenants')
    .delete()
    .eq('portal_id', portalId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`Errore rimozione tenant da portale: ${error.message}`);
}

export async function getPortalTenants(
  supabase: SupabaseClient,
  portalId: string
): Promise<PortalTenant[]> {
  const { data, error } = await supabase
    .from('portal_tenants')
    .select('*')
    .eq('portal_id', portalId)
    .order('sort_order');

  if (error) throw new Error(`Errore query tenant portale: ${error.message}`);
  return (data ?? []) as PortalTenant[];
}
