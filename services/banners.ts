import type { Banner } from '@/types';
import { supabase } from '@/services/supabase';

async function uploadBannerImage(imageUri: string): Promise<string> {
  if (!supabase) throw new Error('Not connected');
  if (imageUri.startsWith('http')) return imageUri;
  const ext = imageUri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const contentType = blob.type || `image/${ext === 'png' ? 'png' : 'jpeg'}`;
  const { error } = await supabase.storage.from('banners').upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('banners').getPublicUrl(path);
  return data.publicUrl;
}

export const bannersService = {
  async listActive(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    return { data: (data as Banner[]) ?? [], error: error?.message ?? null };
  },

  async listAll(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });
    return { data: (data as Banner[]) ?? [], error: error?.message ?? null };
  },

  async create(payload: {
    title: string;
    imageUri?: string | null;
    link_url?: string | null;
    sort_order?: number;
    active?: boolean;
  }): Promise<{ data: Banner | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const image_url = payload.imageUri ? await uploadBannerImage(payload.imageUri) : null;
      const { data, error } = await supabase
        .from('banners')
        .insert({
          title: payload.title,
          image_url,
          link_url: payload.link_url ?? null,
          sort_order: payload.sort_order ?? 0,
          active: payload.active ?? true,
        })
        .select()
        .maybeSingle();
      return { data: (data as Banner) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Upload failed' };
    }
  },

  async update(
    id: string,
    payload: Partial<{
      title: string;
      imageUri: string | null;
      link_url: string | null;
      sort_order: number;
      active: boolean;
    }>
  ): Promise<{ data: Banner | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const patch: Record<string, unknown> = {};
      if (payload.title !== undefined) patch.title = payload.title;
      if (payload.link_url !== undefined) patch.link_url = payload.link_url;
      if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
      if (payload.active !== undefined) patch.active = payload.active;
      if (payload.imageUri) patch.image_url = await uploadBannerImage(payload.imageUri);
      const { data, error } = await supabase
        .from('banners')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      return { data: (data as Banner) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Update failed' };
    }
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('banners').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
