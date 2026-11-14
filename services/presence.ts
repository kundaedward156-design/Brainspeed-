/** Who is online. Reads go straight to read-only database functions; invites go through the `match` function. */
import { supabase } from '@/services/supabase';
import type { OnlinePlayer, IncomingInvite } from '@/types';

export const presenceService = {
  async ping(categoryId: string | null) {
    if (!supabase) return;
    await supabase.rpc('ping_presence', { p_category: categoryId });
  },
  async online(categoryId: string | null): Promise<OnlinePlayer[]> {
    if (!supabase) return [];
    const { data } = await supabase.rpc('online_players', { p_category: categoryId });
    return (data as OnlinePlayer[]) || [];
  },
  async myInvites(): Promise<IncomingInvite[]> {
    if (!supabase) return [];
    const { data } = await supabase.rpc('my_invites');
    return (data as IncomingInvite[]) || [];
  },
};
