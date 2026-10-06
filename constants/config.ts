/**
 * App configuration
 * EAS / local env: see .env.example for exact names
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function fromEnv(key: string, extraKey: string) {
  return (process.env[key] || extra[extraKey] || '').trim();
}

export const AppConfig = {
  name: 'Brainspeed',
  slogan: 'Think fast. Compete smart.\nGet rewarded.',
  currency: 'ZMW',
  currencySymbol: 'K',
  defaultEntryFee: 22,
  platformFeePercent: 9.09,
  bannerRotateMs: 5000,
  supabase: {
    url: fromEnv('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl'),
    anonKey: fromEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey'),
  },
  lipila: {
    merchantId: fromEnv('EXPO_PUBLIC_LIPILA_MERCHANT_ID', 'lipilaMerchantId'),
    apiBase: fromEnv('EXPO_PUBLIC_LIPILA_API_BASE', 'lipilaApiBase'),
  },
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(AppConfig.supabase.url && AppConfig.supabase.anonKey);
}
