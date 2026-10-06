/**
 * Lipila payment interface.
 * Client only starts a request; secret key stays on Edge Function.
 */

export interface DepositRequest {
  amount_zmw: number;
  phone: string;
}

export interface PayoutRequest {
  amount_zmw: number;
  phone: string;
  competition_id: string;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

import { supabase } from '@/services/supabase';

export const paymentsService = {
  async initiateDeposit(req: DepositRequest): Promise<PaymentResult> {
    if (!supabase) return { success: false, error: 'Not connected' };
    const { data, error } = await supabase.functions.invoke('lipila-deposit', {
      body: req,
    });
    if (error) return { success: false, error: error.message };
    return (data as PaymentResult) ?? { success: false, error: 'No response' };
  },

  async initiatePayout(req: PayoutRequest): Promise<PaymentResult> {
    if (!supabase) return { success: false, error: 'Not connected' };
    const { data, error } = await supabase.functions.invoke('lipila-payout', {
      body: req,
    });
    if (error) return { success: false, error: error.message };
    return (data as PaymentResult) ?? { success: false, error: 'No response' };
  },

  async reserveEntryFee(
    userId: string,
    amount_zmw: number,
    competitionId: string
  ): Promise<PaymentResult> {
    if (!supabase) return { success: false, error: 'Not connected' };
    const { data, error } = await supabase.functions.invoke('reserve-entry-fee', {
      body: { user_id: userId, amount_zmw, competition_id: competitionId },
    });
    if (error) return { success: false, error: error.message };
    return (data as PaymentResult) ?? { success: false, error: 'No response' };
  },
};
