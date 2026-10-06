import type { Category } from '@/types';
import { supabase } from '@/services/supabase';

export const categoriesService = {
  async listActive(): Promise<{ data: Category[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    return { data: (data as Category[]) ?? [], error: error?.message ?? null };
  },

  async getById(id: string): Promise<{ data: Category | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async create(payload: Partial<Category>): Promise<{ data: Category | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase.from('categories').insert(payload).select().maybeSingle();
    return { data: (data as Category) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<Category>
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

  async deactivate(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id);
    return { error: error?.message ?? null };
  },
};
