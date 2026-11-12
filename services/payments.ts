/**
 * Wallet. The app only asks; Lipila keys and all balance changes live on the server.
 */
import { supabase } from '@/services/supabase';
import type { WalletEntry } from '@/types';

export interface PaymentResult {
  success: boolean;
  reference?: string;
  error?: string;
  message?: string;
}

async function invoke(fn: string, body: Record<string, unknown>): Promise<PaymentResult> {
  if (!supabase) return { success: false, error: 'Not connected' };
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) return { success: false, error: 'Connection problem. Please try again.' };
  return (data as PaymentResult) ?? { success: false, error: 'No response from the server.' };
}

export const paymentsService = {
  deposit: (amount_zmw: number, phone: string) => invoke('lipila-deposit', { amount_zmw, phone }),
  withdraw: (amount_zmw: number, phone: string) => invoke('lipila-payout', { amount_zmw, phone }),

  /** Ask the server to check any pending deposits/withdrawals with Lipila. */
  async refreshPending(): Promise<number> {
    if (!supabase) return 0;
    const { data } = await supabase.functions.invoke('lipila-status', { body: {} });
    return Number((data as { settled?: number } | null)?.settled ?? 0);
  },

  async history(limit = 50): Promise<{ data: WalletEntry[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_wallet_history', { p_limit: limit });
    return { data: (data as WalletEntry[]) ?? [], error: error?.message ?? null };
  },
};
