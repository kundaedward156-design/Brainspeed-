/**
 * App configuration.
 *
 * ONLY public values live here (Supabase URL + anon key are public by design and are
 * protected by Row Level Security). Every real secret — Lipila, Africa's Talking, the
 * service-role key — lives in Supabase Edge Function secrets, never in the app.
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function fromEnv(key: string, extraKey: string) {
  return (process.env[key] || extra[extraKey] || '').trim();
}

export const AppConfig = {
  name: 'Quivanta Quiz',
  shortName: 'Quivanta',
  slogan: 'Compete Smart. Get rewarded.',
  bannerRotateMs: 5000,
  currency: 'ZMW',
  currencySymbol: 'K',
  supabase: {
    url: fromEnv('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl'),
    anonKey: fromEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey'),
  },
  /** Shown if the admin has not filled the Links screen yet. */
  defaultLinks: {
    telegram_url: '',
    privacy_url: '',
    terms_url: '',
    support_email: '',
    whatsapp_url: '',
  },
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(AppConfig.supabase.url && AppConfig.supabase.anonKey);
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${AppConfig.currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
