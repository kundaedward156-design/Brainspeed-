/**
 * Email + password auth → profiles (id = auth.uid() UUID)
 */
import type { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export const authService = {
  async login({
    email,
    password,
  }: AuthCredentials): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: 'App is not connected to the server yet.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Unable to sign in.' };
    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      return {
        user: null,
        error: 'Profile not found. Contact support if this continues.',
      };
    }
    return { user: profile, error: null };
  },

  async register({
    full_name,
    email,
    password,
  }: RegisterPayload): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: 'App is not connected to the server yet.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Unable to create account.' };

    // Profile is normally created by DB trigger on auth.users insert.
    // Fallback upsert if trigger is not yet installed.
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name,
      email,
      role: 'player',
    });
    if (profileError) {
      // Trigger may have already created the row
    }

    const profile = await fetchProfile(data.user.id);
    return {
      user: profile,
      error: profile
        ? null
        : 'Account created. Please verify your email if required, then log in.',
    };
  },

  async logout(): Promise<{ error: string | null }> {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  },

  async getSession(): Promise<{ session: unknown | null; error: string | null }> {
    if (!supabase) return { session: null, error: null };
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error: error?.message ?? null };
  },

  async getCurrentProfile(): Promise<{ profile: Profile | null; error: string | null }> {
    if (!supabase) return { profile: null, error: null };
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return { profile: null, error: null };
    const profile = await fetchProfile(uid);
    return { profile, error: null };
  },
};
