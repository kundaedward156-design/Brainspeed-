import type { Profile } from '@/types';
import { supabase } from '@/services/supabase';

export const profilesService = {
  async getById(id: string): Promise<{ data: Profile | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    return { data: (data as Profile) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    updates: Partial<Profile>
  ): Promise<{ data: Profile | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: (data as Profile) ?? null, error: error?.message ?? null };
  },

  async getStats(id: string): Promise<{ wins: number; losses: number; total_score: number } | null> {
    const { data } = await this.getById(id);
    if (!data) return null;
    return { wins: data.wins, losses: data.losses, total_score: data.total_score };
  },
};
