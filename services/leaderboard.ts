import { supabase } from '@/services/supabase';
import type { LeaderboardData } from '@/types';

export const leaderboardService = {
  async get(limit = 10): Promise<{ data: LeaderboardData; error: string | null }> {
    const empty: LeaderboardData = { top: [], winners: [] };
    if (!supabase) return { data: empty, error: null };
    const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: limit });
    if (error) return { data: empty, error: error.message };
    const d = data as Partial<LeaderboardData> | null;
    return { data: { top: d?.top ?? [], winners: d?.winners ?? [], updated_at: d?.updated_at }, error: null };
  },
};
