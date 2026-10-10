import type { Reward } from '@/types';
import { supabase } from '@/services/supabase';

async function uploadRewardImage(imageUri: string): Promise<string> {
  if (!supabase) throw new Error('Not connected');
  if (imageUri.startsWith('http')) return imageUri;
  const ext = imageUri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const contentType = blob.type || `image/${ext === 'png' ? 'png' : 'jpeg'}`;
  const { error } = await supabase.storage.from('rewards').upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('rewards').getPublicUrl(path);
  return data.publicUrl;
}

export const rewardsService = {
  async listPublished(): Promise<{ data: Reward[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('published', true)
      .order('amount_zmw', { ascending: false });
    return { data: (data as Reward[]) ?? [], error: error?.message ?? null };
  },

  async listAll(): Promise<{ data: Reward[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('amount_zmw', { ascending: false });
    return { data: (data as Reward[]) ?? [], error: error?.message ?? null };
  },

  async create(payload: {
    title: string;
    amount_zmw: number;
    imageUri?: string | null;
    published?: boolean;
  }): Promise<{ data: Reward | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const image_url = payload.imageUri ? await uploadRewardImage(payload.imageUri) : null;
      const { data, error } = await supabase
        .from('rewards')
        .insert({
          title: payload.title,
          amount_zmw: payload.amount_zmw,
          image_url,
          published: payload.published ?? true,
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
    payload: Partial<{
      title: string;
      amount_zmw: number;
      imageUri: string | null;
      published: boolean;
    }>
  ): Promise<{ data: Reward | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const patch: Record<string, unknown> = {};
      if (payload.title !== undefined) patch.title = payload.title;
      if (payload.amount_zmw !== undefined) patch.amount_zmw = payload.amount_zmw;
      if (payload.published !== undefined) patch.published = payload.published;
      if (payload.imageUri) patch.image_url = await uploadRewardImage(payload.imageUri);
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

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('rewards').delete().eq('id', id);
    return { error: error?.message ?? null };
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
};
