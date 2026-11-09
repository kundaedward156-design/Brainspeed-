/**
 * Auth: Email+password OR Phone OTP (Africa's Talking via Edge Functions)
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

    const profile = await fetchProfile(data.user.id);
    return {
      user: profile,
      error: profile
        ? null
        : 'Account created. Please verify your email if required, then log in.',
    };
  },

  /** Request SMS OTP via Africa's Talking (Edge Function send-otp) */
  async requestPhoneOtp(phone: string): Promise<{ success: boolean; error: string | null; debug_otp?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'App is not connected to the server yet.' };
    }
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone },
    });
    if (error) return { success: false, error: error.message };
    const res = data as { success?: boolean; error?: string; debug_otp?: string };
    if (!res?.success) return { success: false, error: res?.error || 'Failed to send OTP' };
    return { success: true, error: null, debug_otp: res.debug_otp };
  },

  /** Verify OTP → create-session → sign in */
  async verifyPhoneOtp(
    phone: string,
    code: string,
    full_name?: string
  ): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: 'App is not connected to the server yet.' };
    }
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { phone, code, full_name },
    });
    if (error) return { user: null, error: error.message };
    const res = data as {
      success?: boolean;
      error?: string;
      user_id?: string;
      exchange_token?: string;
    };
    if (!res?.success || !res.exchange_token) {
      return { user: null, error: res?.error || 'Verification failed' };
    }

    const { data: sess, error: sessErr } = await supabase.functions.invoke('create-session', {
      body: { exchange_token: res.exchange_token, phone },
    });
    if (sessErr) return { user: null, error: sessErr.message };
    const s = sess as {
      success?: boolean;
      error?: string;
      email?: string;
      temp_password?: string;
      hashed_token?: string;
      user_id?: string;
    };
    if (!s?.success) return { user: null, error: s?.error || 'Session failed' };

    if (s.temp_password && s.email) {
      const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
        email: s.email,
        password: s.temp_password,
      });
      if (signErr) return { user: null, error: signErr.message };
      const profile = await fetchProfile(signed.user?.id || s.user_id || '');
      return { user: profile, error: profile ? null : 'Profile missing' };
    }

    if (s.hashed_token) {
      const { data: verified, error: vErr } = await supabase.auth.verifyOtp({
        token_hash: s.hashed_token,
        type: 'magiclink',
      });
      if (vErr) return { user: null, error: vErr.message };
      const profile = await fetchProfile(verified.user?.id || s.user_id || '');
      return { user: profile, error: profile ? null : 'Profile missing' };
    }

    return { user: null, error: 'Could not establish session' };
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
