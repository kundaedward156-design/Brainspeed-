import type { Reward } from '@/types';
import { supabase } from '@/services/supabase';
import { uploadImageToBucket } from '@/services/storage';

export const rewardsService = {
  async listPublished(): Promise<{ data: Reward[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    let { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('published', true)
      .order('amount_zmw', { ascending: false });

    if (error && /published|column/i.test(error.message)) {
      const retry = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('amount_zmw', { ascending: false });
      data = retry.data;
      error = retry.error;
    }

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
    imageUri: string;
    published?: boolean;
  }): Promise<{ data: Reward | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    if (!payload.imageUri?.trim()) {
      return { data: null, error: 'Please upload a reward image first.' };
    }

    let image_url: string;
    try {
      image_url = await uploadImageToBucket('rewards', payload.imageUri);
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Image upload failed' };
    }

    if (!image_url) {
      return { data: null, error: 'Image upload failed — no public URL returned.' };
    }

    const row: Record<string, unknown> = {
      title: payload.title,
      amount_zmw: payload.amount_zmw,
      image_url,
      published: payload.published ?? true,
    };

    const { data, error } = await supabase.from('rewards').insert(row).select().maybeSingle();

    if (error && /published|column/i.test(error.message)) {
      delete row.published;
      row.is_active = payload.published ?? true;
      const retry = await supabase.from('rewards').insert(row).select().maybeSingle();
      return { data: (retry.data as Reward) ?? null, error: retry.error?.message ?? null };
    }

    return { data: (data as Reward) ?? null, error: error?.message ?? null };
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

    const patch: Record<string, unknown> = {};
    if (payload.title !== undefined) patch.title = payload.title;
    if (payload.amount_zmw !== undefined) patch.amount_zmw = payload.amount_zmw;
    if (payload.published !== undefined) patch.published = payload.published;

    if (payload.imageUri) {
      try {
        patch.image_url = await uploadImageToBucket('rewards', payload.imageUri);
      } catch (e: any) {
        return { data: null, error: e?.message ?? 'Image upload failed' };
      }
    }

    const { data, error } = await supabase
      .from('rewards')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error && payload.published !== undefined && /published|column/i.test(error.message)) {
      delete patch.published;
      patch.is_active = payload.published;
      const retry = await supabase.from('rewards').update(patch).eq('id', id).select().maybeSingle();
      return { data: (retry.data as Reward) ?? null, error: retry.error?.message ?? null };
    }

    return { data: (data as Reward) ?? null, error: error?.message ?? null };
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
