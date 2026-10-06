import type { Quiz } from '@/types';
import { supabase } from '@/services/supabase';

export const quizzesService = {
  async listActive(): Promise<{ data: Quiz[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return { data: (data as Quiz[]) ?? [], error: error?.message ?? null };
  },

  async getById(id: string): Promise<{ data: Quiz | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('quizzes').select('*').eq('id', id).maybeSingle();
    return { data: (data as Quiz) ?? null, error: error?.message ?? null };
  },

  async listFeatured(): Promise<{ data: Quiz[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    return { data: (data as Quiz[]) ?? [], error: error?.message ?? null };
  },

  async create(payload: Partial<Quiz>): Promise<{ data: Quiz | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase.from('quizzes').insert(payload).select().maybeSingle();
    return { data: (data as Quiz) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<Quiz>
  ): Promise<{ data: Quiz | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('quizzes')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: (data as Quiz) ?? null, error: error?.message ?? null };
  },

  async setActive(id: string, active: boolean): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('quizzes').update({ is_active: active }).eq('id', id);
    return { error: error?.message ?? null };
  },
};
