import type { Category, Subject } from '@/types';
import { supabase } from '@/services/supabase';
import { uploadImageToBucket } from '@/services/storage';

type Result<T> = { data: T; error: string | null };

export const categoriesService = {
  /** Subjects with live numbers (players, waiting, questions). Admins can ask for inactive ones too. */
  async listWithStats(all = false): Promise<Result<Subject[]>> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_categories', { p_all: all });
    return { data: ((data as Subject[]) ?? []).filter(Boolean), error: error?.message ?? null };
  },

  /** Plain list (no stats) for pickers. */
  async list(): Promise<Result<Category[]>> {
    const res = await this.listWithStats(true);
    return res;
  },

  async listActive(): Promise<Result<Category[]>> {
    return this.listWithStats(false);
  },

  async create(payload: {
    name: string;
    description?: string | null;
    icon?: string | null;
    accent?: string | null;
    imageUri?: string | null;
    sort_order?: number;
  }): Promise<Result<Category | null>> {
    if (!supabase) return { data: null, error: 'Not connected' };
    let image_url: string | null = null;
    if (payload.imageUri) {
      try {
        image_url = await uploadImageToBucket('banners', payload.imageUri);
      } catch (e: any) {
        return { data: null, error: e?.message ?? 'Image upload failed' };
      }
    }
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        icon: payload.icon ?? null,
        accent: payload.accent ?? null,
        image_url,
        sort_order: payload.sort_order ?? 0,
      })
      .select()
      .maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<{
      name: string;
      description: string | null;
      icon: string | null;
      accent: string | null;
      imageUri: string | null;
      removeImage: boolean;
      sort_order: number;
      is_active: boolean;
    }>
  ): Promise<Result<Category | null>> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { imageUri, removeImage, ...rest } = payload;
    const patch: Record<string, unknown> = { ...rest };
    if (imageUri && !imageUri.startsWith('http')) {
      try {
        patch.image_url = await uploadImageToBucket('banners', imageUri);
      } catch (e: any) {
        return { data: null, error: e?.message ?? 'Image upload failed' };
      }
    } else if (removeImage) {
      patch.image_url = null;
    }
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
