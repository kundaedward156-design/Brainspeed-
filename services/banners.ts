import type { Banner } from '@/types';
import { supabase } from '@/services/supabase';

export interface BannerPayload {
  title: string;
  description?: string | null;
  button_text?: string | null;
  destination?: string | null;
  priority?: number;
  starts_at?: string | null;
  ends_at?: string | null;
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
  const { error } = await supabase.storage.from('banners').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('banners').getPublicUrl(path);
  return data.publicUrl;
}

export const bannersService = {
  async listActive(): Promise<{ data: Banner[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });
    const filtered = ((data as Banner[]) ?? []).filter((b) => {
      if (b.starts_at && b.starts_at > now) return false;
      if (b.ends_at && b.ends_at < now) return false;
      return true;
    });
    return { data: filtered, error: error?.message ?? null };
  },

  async create(payload: BannerPayload): Promise<{ data: Banner | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const image_url = await uploadIfNeeded(payload.imageUri);
      const { data, error } = await supabase
        .from('banners')
        .insert({
          title: payload.title,
          description: payload.description ?? null,
          button_text: payload.button_text ?? null,
          destination: payload.destination ?? null,
          priority: payload.priority ?? 0,
          starts_at: payload.starts_at ?? null,
          ends_at: payload.ends_at ?? null,
          is_active: payload.is_active ?? true,
          image_url,
        })
        .select()
        .maybeSingle();
      return { data: (data as Banner) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Upload failed' };
    }
  },

  async update(
    id: string,
    payload: Partial<BannerPayload>
  ): Promise<{ data: Banner | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    try {
      const patch: Record<string, unknown> = { ...payload };
      delete patch.imageUri;
      if (payload.imageUri) {
        patch.image_url = await uploadIfNeeded(payload.imageUri);
      }
      const { data, error } = await supabase
        .from('banners')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      return { data: (data as Banner) ?? null, error: error?.message ?? null };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Update failed' };
    }
  },

  async deactivate(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('banners').update({ is_active: false }).eq('id', id);
    return { error: error?.message ?? null };
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
