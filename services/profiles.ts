import type { Profile } from '@/types';
import { supabase } from '@/services/supabase';

export const profilesService = {
  async getById(id: string): Promise<{ data: Profile | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    return { data: (data as Profile) ?? null, error: error?.message ?? null };
  },

  /** Players may only change these fields (the database enforces it too). */
  async update(
    id: string,
    updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'push_enabled'>>
  ): Promise<{ data: Profile | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const payload: Record<string, unknown> = {};
    if (updates.full_name !== undefined) payload.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
    if (updates.push_enabled !== undefined) payload.push_enabled = updates.push_enabled;
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select().maybeSingle();
    return { data: (data as Profile) ?? null, error: error?.message ?? null };
  },
};
