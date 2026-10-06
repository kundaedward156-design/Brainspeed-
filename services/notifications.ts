import type { AppNotification } from '@/types';
import { supabase } from '@/services/supabase';

export const notificationsService = {
  async listForUser(userId: string): Promise<{ data: AppNotification[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(userId ? `user_id.eq.${userId},user_id.is.null` : 'user_id.is.null')
      .order('created_at', { ascending: false })
      .limit(50);
    return { data: (data as AppNotification[]) ?? [], error: error?.message ?? null };
  },

  async markRead(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: null };
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    return { error: error?.message ?? null };
  },

  async markAllRead(userId: string): Promise<{ error: string | null }> {
    if (!supabase || !userId) return { error: null };
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    return { error: error?.message ?? null };
  },
};
