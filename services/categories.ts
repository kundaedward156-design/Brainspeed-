import type { Category } from '@/types';
import { supabase } from '@/services/supabase';

export const categoriesService = {
  async list(): Promise<{ data: Category[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    return { data: (data as Category[]) ?? [], error: error?.message ?? null };
  },

  async listActive(): Promise<{ data: Category[]; error: string | null }> {
    return this.list();
  },

  async create(payload: {
    name: string;
    icon?: string | null;
    sort_order?: number;
  }): Promise<{ data: Category | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: payload.name,
        icon: payload.icon ?? null,
        sort_order: payload.sort_order ?? 0,
      })
      .select()
      .maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<{ name: string; icon: string | null; sort_order: number }>
  ): Promise<{ data: Category | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
