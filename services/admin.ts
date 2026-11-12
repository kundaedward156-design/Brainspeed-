import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

export interface AdminStats {
  users: number;
  questions: number;
  matches_completed: number;
  matches_live: number;
  deposits_total: number;
  withdrawals_total: number;
  withdrawals_pending: number;
  platform_revenue: number;
  wallet_balances: number;
}

export interface AdminTx {
  id: string;
  type: 'deposit' | 'withdraw';
  amount_zmw: number;
  status: string;
  phone?: string | null;
  reference_id?: string | null;
  failure_reason?: string | null;
  created_at: string;
  full_name?: string | null;
}

export interface AdminMatch {
  id: string;
  status: string;
  player1?: string | null;
  player2?: string | null;
  winner?: string | null;
  player1_score: number;
  player2_score: number;
  prize_zmw: number;
  is_draw: boolean;
  created_at: string;
}

export interface AdminQuestion {
  id: string;
  category_id?: string | null;
  text: string;
  options: string[];
  correct_index: number;
  difficulty?: string;
  is_active: boolean;
  created_at?: string;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('is_admin');
      return !error && Boolean(data);
    } catch {
      return false;
    }
  },

  async getStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.rpc('admin_stats');
    return { data: (data as AdminStats) ?? null, error: error?.message ?? null };
  },

  async listUsers(page = 0): Promise<{ data: Profile[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const from = page * 50;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + 49);
    return { data: (data as Profile[]) ?? [], error: error?.message ?? null };
  },

  async listTransactions(type?: 'deposit' | 'withdraw'): Promise<{ data: AdminTx[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.rpc('admin_list_transactions', { p_type: type ?? null, p_limit: 100 });
    return { data: (data as AdminTx[]) ?? [], error: error?.message ?? null };
  },

  async listMatches(): Promise<{ data: AdminMatch[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.rpc('admin_list_matches', { p_limit: 100 });
    return { data: (data as AdminMatch[]) ?? [], error: error?.message ?? null };
  },

  async sendAnnouncement(title: string, body: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.rpc('admin_send_announcement', { p_title: title, p_body: body });
    return { error: error?.message ?? null };
  },

  // Questions: admins read/write the table directly (RLS blocks everyone else).
  async listQuestions(): Promise<{ data: AdminQuestion[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('questions')
      .select('id, category_id, text, options, correct_index, difficulty, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    return { data: (data as AdminQuestion[]) ?? [], error: error?.message ?? null };
  },

  async saveQuestion(q: Partial<AdminQuestion> & { text: string; options: string[]; correct_index: number }): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const row = {
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      category_id: q.category_id ?? null,
      difficulty: q.difficulty ?? 'medium',
      is_active: q.is_active ?? true,
    };
    const { error } = q.id
      ? await supabase.from('questions').update(row).eq('id', q.id)
      : await supabase.from('questions').insert(row);
    return { error: error?.message ?? null };
  },

  async setQuestionActive(id: string, active: boolean): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('questions').update({ is_active: active }).eq('id', id);
    return { error: error?.message ?? null };
  },
};
