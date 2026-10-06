import { supabase } from '@/services/supabase';

export interface AdminStats {
  total_users: number;
  active_users: number;
  competitions: number;
  completed_competitions: number;
  questions: number;
  active_banners: number;
  rewards: number;
}

export const adminService = {
  async getStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };

    const [users, comps, completed, questions, banners, rewards] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('competitions').select('id', { count: 'exact', head: true }),
      supabase
        .from('competitions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('rewards').select('id', { count: 'exact', head: true }),
    ]);

    return {
      data: {
        total_users: users.count ?? 0,
        active_users: users.count ?? 0,
        competitions: comps.count ?? 0,
        completed_competitions: completed.count ?? 0,
        questions: questions.count ?? 0,
        active_banners: banners.count ?? 0,
        rewards: rewards.count ?? 0,
      },
      error: null,
    };
  },

  async listUsers(page = 0): Promise<{ data: unknown[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const from = page * 50;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + 49);
    return { data: data ?? [], error: error?.message ?? null };
  },
};
