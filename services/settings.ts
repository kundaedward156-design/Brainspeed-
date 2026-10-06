import type { AppSettings } from '@/types';
import { supabase } from '@/services/supabase';

export const settingsService = {
  async get(): Promise<{ data: AppSettings | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
    return { data: (data as AppSettings) ?? null, error: error?.message ?? null };
  },

  async update(payload: Partial<AppSettings>): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('app_settings').update(payload).neq('id', '00000000-0000-0000-0000-000000000000');
    return { error: error?.message ?? null };
  },
};
