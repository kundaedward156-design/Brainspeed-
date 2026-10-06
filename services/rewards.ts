import type { Reward, RewardTransaction } from '@/types';
import { supabase } from '@/services/supabase';

export interface RewardPayload {
  title: string;
  description?: string | null;
  amount_zmw: number;
  is_active?: boolean;
  imageUri?: string | null;
}

async function uploadIfNeeded(imageUri?: string | null): Promise<string | null> {
  if (!imageUri || !supabase) return null;
  if (imageUri.startsWith('http')) return imageUri;
  const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from('rewards').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('rewards').getPublicUrl(path);
  return data.publicUrl;
}

export const rewardsService = {
  async listAvailable(): Promise<{ data: Reward[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return { data: (data as Reward[]) ?? [], error: error?.message ?? null };
  },

  async getBalance(userId: string): Promise<{ balance_zmw: number; error: string | null }> {
    if (!supabase || !userId) return { balance_zmw: 0, error: null };
    const { data, error } = await supabase
      .from('profiles')
      .select('balance_zmw')
      .eq('id', userId)
      .maybeSingle();
    return { balance_zmw: Number(data?.balance_zmw ?? 0), error: error?.message ?? null };
  },

  async getHistory(userId: string): Promise<{ data: RewardTransaction[]; error: string | null }> {
    if (!supabase || !userId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return { data: (data as RewardTransaction[]) ?? [], error: error?.message ?? null };
  },

  async create(payload: RewardPayload): Promise<{ data: Reward | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const image_url = await uploadIfNeeded(payload.imageUri);
      const { data, error } = await supabase
        .from('rewards')
        .insert({
          title: payload.title,
          description: payload.description ?? null,
          amount_zmw: payload.amount_zmw,
          is_active: payload.is_active ?? true,
          image_url,
        })
        .select()
        .maybeSingle();
      return { data: (data as Reward) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Upload failed' };
    }
  },

  async update(
    id: string,
    payload: Partial<RewardPayload>
  ): Promise<{ data: Reward | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const patch: Record<string, unknown> = { ...payload };
      delete patch.imageUri;
      if (payload.imageUri) patch.image_url = await uploadIfNeeded(payload.imageUri);
      const { data, error } = await supabase
        .from('rewards')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      return { data: (data as Reward) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Update failed' };
    }
  },

  async uploadImage(
    localUri: string,
    _fileName: string
  ): Promise<{ publicUrl: string | null; error: string | null }> {
    try {
      const url = await uploadIfNeeded(localUri);
      return { publicUrl: url, error: null };
    } catch (e: any) {
      return { publicUrl: null, error: e?.message ?? 'Upload failed' };
    }
  },
};
