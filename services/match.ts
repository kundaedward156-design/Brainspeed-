/** Gameplay client. Every call goes to the `match` Edge Function; the server decides everything. */
import { supabase } from '@/services/supabase';
import type { MatchState, MatchResult } from '@/types';

type Reply<T> = { data: T | null; error: string | null };

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<Reply<T>> {
  if (!supabase) return { data: null, error: 'Not connected' };
  const { data, error } = await supabase.functions.invoke('match', { body: { action, ...payload } });
  if (error) return { data: null, error: 'Connection problem. Please try again.' };
  const res = data as { success?: boolean; data?: T; error?: string };
  if (!res?.success) return { data: null, error: res?.error || 'Request failed' };
  return { data: (res.data as T) ?? null, error: null };
}

export const matchService = {
  find: () => call<MatchState>('find'),
  state: () => call<MatchState>('state'),
  cancel: () => call<MatchState>('cancel'),
  respond: (competition_id: string, accept: boolean) => call<MatchState>('respond', { competition_id, accept }),
  answer: (competition_id: string, index: number, selected: number) =>
    call<MatchState>('answer', { competition_id, index, selected }),
  result: (competition_id: string) => call<MatchResult>('result', { competition_id }),
};
