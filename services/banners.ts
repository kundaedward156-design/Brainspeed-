import type { Banner } from '@/types';
import { supabase } from '@/services/supabase';
import { uploadImageToBucket } from '@/services/storage';

export const bannersService = {
  async listActive(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    // Support both `active` and legacy `is_active` column names
    let { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error && /active|column/i.test(error.message)) {
      const retry = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      data = retry.data;
      error = retry.error;
    }

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
      link_url: payload.link_url ?? null,
      sort_order: payload.sort_order ?? 0,
      active: payload.active ?? true,
    };

    const { data, error } = await supabase.from('banners').insert(row).select().maybeSingle();

    // Fallback if DB uses is_active instead of active
    if (error && /active|column/i.test(error.message)) {
      delete row.active;
      row.is_active = payload.active ?? true;
      const retry = await supabase.from('banners').insert(row).select().maybeSingle();
      return { data: (retry.data as Banner) ?? null, error: retry.error?.message ?? null };
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
    if (payload.link_url !== undefined) patch.link_url = payload.link_url;
    if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
    if (payload.active !== undefined) patch.active = payload.active;

    if (payload.imageUri) {
      try {
        patch.image_url = await uploadImageToBucket('banners', payload.imageUri);
      } catch (e: any) {
        return { data: null, error: e?.message ?? 'Image upload failed' };
      }
    }

    const { data, error } = await supabase
      .from('banners')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error && payload.active !== undefined && /active|column/i.test(error.message)) {
      delete patch.active;
      patch.is_active = payload.active;
      const retry = await supabase.from('banners').update(patch).eq('id', id).select().maybeSingle();
      return { data: (retry.data as Banner) ?? null, error: retry.error?.message ?? null };
    }

    return { data: (data as Banner) ?? null, error: error?.message ?? null };
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('banners').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
