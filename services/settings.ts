import type { AppSetting, CompetitionRulesSetting, MaintenanceSetting, ScoringSetting } from '@/types';
import { supabase } from '@/services/supabase';

async function getKey(key: string): Promise<{ value: Record<string, unknown> | null; error: string | null }> {
  if (!supabase) return { value: null, error: null };
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', key)
    .maybeSingle();
  if (error) return { value: null, error: error.message };
  return { value: (data as AppSetting | null)?.value ?? null, error: null };
}

async function setKey(
  key: string,
  value: Record<string, unknown>
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not connected' };
  const { data: existing } = await supabase
    .from('app_settings')
    .select('key')
    .eq('key', key)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from('app_settings').update({ value }).eq('key', key);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from('app_settings').insert({ key, value });
  return { error: error?.message ?? null };
}

export const settingsService = {
  async getCompetitionRules(): Promise<{ data: CompetitionRulesSetting; error: string | null }> {
    const { value, error } = await getKey('competition_rules');
    return { data: (value as CompetitionRulesSetting) ?? { text: '' }, error };
  },

  async setCompetitionRules(text: string): Promise<{ error: string | null }> {
    return setKey('competition_rules', { text });
  },

  async getScoring(): Promise<{ data: ScoringSetting; error: string | null }> {
    const { value, error } = await getKey('scoring');
    return {
      data: (value as ScoringSetting) ?? { points_per_correct: 5 },
      error,
    };
  },

  async setScoring(points_per_correct: number): Promise<{ error: string | null }> {
    return setKey('scoring', { points_per_correct });
  },

  async getMaintenance(): Promise<{ data: MaintenanceSetting; error: string | null }> {
    const { value, error } = await getKey('maintenance');
    return {
      data: (value as MaintenanceSetting) ?? { enabled: false, message: '' },
      error,
    };
  },

  async setMaintenance(enabled: boolean, message: string): Promise<{ error: string | null }> {
    return setKey('maintenance', { enabled, message });
  },

  async getPlatformFees(): Promise<{
    data: { platform_fee_zmw: number; default_entry_fee_zmw: number; competition_fee_zmw: number };
    error: string | null;
  }> {
    const { value, error } = await getKey('platform_fees');
    return {
      data: {
        platform_fee_zmw: Number((value as any)?.platform_fee_zmw ?? 3),
        default_entry_fee_zmw: Number((value as any)?.default_entry_fee_zmw ?? 23),
        competition_fee_zmw: Number((value as any)?.competition_fee_zmw ?? 20),
      },
      error,
    };
  },

  async setPlatformFees(fees: {
    platform_fee_zmw: number;
    default_entry_fee_zmw: number;
    competition_fee_zmw: number;
  }): Promise<{ error: string | null }> {
    return setKey('platform_fees', fees as unknown as Record<string, unknown>);
  },
};
