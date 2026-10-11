import type { Banner } from '@/types';
import { supabase } from '@/services/supabase';
import { uploadImageToBucket } from '@/services/storage';

export const bannersService = {
  async listActive(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    return { data: (data as Banner[]) ?? [], error: error?.message ?? null };
  },

  async listAll(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('priority', { ascending: false });
    return { data: (data as Banner[]) ?? [], error: error?.message ?? null };
  },

  async create(payload: {
    title: string;
    imageUri: string;
    link_url?: string | null;
    sort_order?: number;
    active?: boolean;
  }): Promise<{ data: Banner | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    if (!payload.imageUri?.trim()) {
      return { data: null, error: 'Please upload a banner image first.' };
    }

    let image_url: string;
    try {
      image_url = await uploadImageToBucket('banners', payload.imageUri);
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Image upload failed' };
    }

    if (!image_url) {
      return { data: null, error: 'Image upload failed — no public URL returned.' };
    }

    const row: Record<string, unknown> = {
      title: payload.title,
      image_url,
      priority: payload.sort_order ?? 0,
      is_active: payload.active ?? true,
    };
    if (payload.link_url) row.destination = payload.link_url;

    let { data, error } = await supabase.from('banners').insert(row).select().maybeSingle();

    // Fallback if destination column does not exist
    if (error && /destination|column/i.test(error.message)) {
      delete row.destination;
      const retry = await supabase.from('banners').insert(row).select().maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    return { data: (data as Banner) ?? null, error: error?.message ?? null };
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

    const patch: Record<string, unknown> = {};
    if (payload.title !== undefined) patch.title = payload.title;
    if (payload.link_url !== undefined) patch.destination = payload.link_url;
    if (payload.sort_order !== undefined) patch.priority = payload.sort_order;
    if (payload.active !== undefined) patch.is_active = payload.active;

    if (payload.imageUri && !payload.imageUri.startsWith('http')) {
      try {
        patch.image_url = await uploadImageToBucket('banners', payload.imageUri);
      } catch (e: any) {
        return { data: null, error: e?.message ?? 'Image upload failed' };
      }
    } else if (payload.imageUri) {
      patch.image_url = payload.imageUri;
    }

    const { data, error } = await supabase
      .from('banners')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    return { data: (data as Banner) ?? null, error: error?.message ?? null };
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('banners').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
