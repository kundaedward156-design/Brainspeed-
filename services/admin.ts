import { supabase } from '@/services/supabase';

export interface AdminStats {
  total_users: number;
  competitions: number;
  questions: number;
  active_banners: number;
  rewards: number;
  entries: number;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        // Fallback: profile.role
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        if (!uid) return false;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();
        return profile?.role === 'admin';
      }
      return Boolean(data);
    } catch {
      return false;
    }
  },

  async getStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };

    const [users, comps, questions, banners, rewards, entries] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('competitions').select('id', { count: 'exact', head: true }),
      supabase.from('quiz_questions').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('rewards').select('id', { count: 'exact', head: true }),
      supabase.from('competition_entries').select('competition_id', { count: 'exact', head: true }),
    ]);

    return {
      data: {
        total_users: users.count ?? 0,
        competitions: comps.count ?? 0,
        questions: questions.count ?? 0,
        active_banners: banners.count ?? 0,
        rewards: rewards.count ?? 0,
        entries: entries.count ?? 0,
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
