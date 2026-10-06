import type { Question } from '@/types';
import { supabase } from '@/services/supabase';

export const questionsService = {
  async listByCategory(categoryId: string): Promise<{ data: Question[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true);
    return { data: (data as Question[]) ?? [], error: error?.message ?? null };
  },

  async getById(id: string): Promise<{ data: Question | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
    return { data: (data as Question) ?? null, error: error?.message ?? null };
  },

  async create(payload: Partial<Question>): Promise<{ data: Question | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase.from('questions').insert(payload).select().maybeSingle();
    return { data: (data as Question) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<Question>
  ): Promise<{ data: Question | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('questions')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: (data as Question) ?? null, error: error?.message ?? null };
  },

  async deactivate(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('questions').update({ is_active: false }).eq('id', id);
    return { error: error?.message ?? null };
  },
};
