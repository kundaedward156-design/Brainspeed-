/**
 * Auth: phone OTP (Supabase Auth, SMS delivered by Africa's Talking through the
 * Send-SMS hook) or email + password.
 */
import type { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { toE164Zm } from '@/utils/phone';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

const NOT_CONNECTED = 'The app cannot reach the server. Check your internet connection and try again.';

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  // The profile row is created by a database trigger; allow a moment for brand-new users.
  for (let i = 0; i < 4; i++) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) return data as Profile;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

function niceAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/otp|token/i.test(message) && /expired|invalid/i.test(message)) return 'That code is wrong or has expired. Request a new one.';
  if (/rate limit|too many|security purposes/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  if (/sms|provider|hook/i.test(message)) return 'We could not send the SMS right now. Please try again shortly.';
  return message;
}

export const authService = {
  async login({ email, password }: AuthCredentials): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) return { user: null, error: NOT_CONNECTED };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: niceAuthError(error.message) };
    if (!data.user) return { user: null, error: 'Unable to sign in.' };
    const profile = await fetchProfile(data.user.id);
    return profile ? { user: profile, error: null } : { user: null, error: 'Profile not found. Contact support.' };
  },

  async register({ full_name, email, password }: RegisterPayload): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) return { user: null, error: NOT_CONNECTED };
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });
    if (error) return { user: null, error: niceAuthError(error.message) };
    if (!data.user) return { user: null, error: 'Unable to create account.' };
    if (!data.session) {
      return { user: null, error: 'Account created. Check your email to confirm it, then log in.' };
    }
    const profile = await fetchProfile(data.user.id);
    return { user: profile, error: profile ? null : 'Account created. Please log in.' };
  },

  /** Step 1 — Supabase generates the code and hands it to our send-sms hook. */
  async requestPhoneOtp(phone: string, fullName?: string): Promise<{ error: string | null; phone?: string }> {
    if (!isSupabaseConfigured || !supabase) return { error: NOT_CONNECTED };
    const e164 = toE164Zm(phone);
    if (!e164) return { error: 'Enter a valid MTN, Airtel or Zamtel number, e.g. 097 123 4567.' };
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true, data: fullName ? { full_name: fullName } : undefined },
    });
    if (error) return { error: niceAuthError(error.message) };
    return { error: null, phone: e164 };
  },

  /** Step 2 — verify the SMS code; Supabase returns a real session. */
  async verifyPhoneOtp(phone: string, code: string): Promise<{ user: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) return { user: null, error: NOT_CONNECTED };
    const e164 = toE164Zm(phone);
    if (!e164) return { user: null, error: 'Invalid phone number.' };
    const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' });
    if (error) return { user: null, error: niceAuthError(error.message) };
    if (!data.user) return { user: null, error: 'Could not sign you in.' };
    const profile = await fetchProfile(data.user.id);
    return profile ? { user: profile, error: null } : { user: null, error: 'Profile not found. Contact support.' };
  },

  async logout(): Promise<{ error: string | null }> {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  },

  async getCurrentProfile(): Promise<{ profile: Profile | null; error: string | null }> {
    if (!supabase) return { profile: null, error: null };
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return { profile: null, error: null };
    const { data: row, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    return { profile: (row as Profile) ?? null, error: error?.message ?? null };
  },
};
