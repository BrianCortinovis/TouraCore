import type { SupabaseClient } from '@supabase/supabase-js';
import type { Media, MediaQuery } from './types';

export async function insertMedia(
  supabase: SupabaseClient,
  data: Omit<Media, 'id' | 'created_at'>
): Promise<Media> {
  const { data: media, error } = await supabase
    .from('media')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Errore inserimento media: ${error.message}`);
  return media as Media;
}

export async function listMedia(
  supabase: SupabaseClient,
  query: MediaQuery
): Promise<{ data: Media[]; count: number }> {
  const from = (query.page - 1) * query.per_page;
  const to = from + query.per_page - 1;

  let q = supabase
    .from('media')
    .select('*', { count: 'exact' })
    .eq('tenant_id', query.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query.mime_filter) {
    q = q.like('mime_type', `${query.mime_filter}%`);
  }

  if (query.search) {
    q = q.or(
      `original_name.ilike.%${query.search}%,alt_text.ilike.%${query.search}%`
    );
  }

  const { data, count, error } = await q;

  if (error) throw new Error(`Errore query media: ${error.message}`);
  return { data: (data ?? []) as Media[], count: count ?? 0 };
}

export async function getMediaById(
  supabase: SupabaseClient,
  id: string
): Promise<Media | null> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore query media: ${error.message}`);
  }
  return data as Media;
}

export async function deleteMedia(
  supabase: SupabaseClient,
  id: string
): Promise<Media> {
  const { data, error } = await supabase
    .from('media')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Errore eliminazione media: ${error.message}`);
  return data as Media;
}

export async function updateMediaAltText(
  supabase: SupabaseClient,
  id: string,
  alt_text: string
): Promise<Media> {
  const { data, error } = await supabase
    .from('media')
    .update({ alt_text })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Errore aggiornamento media: ${error.message}`);
  return data as Media;
}
