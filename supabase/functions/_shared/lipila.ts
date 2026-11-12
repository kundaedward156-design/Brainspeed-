// Lipila mobile-money client. API key lives in Supabase secrets (LIPILA_API_KEY).
export const LIPILA_BASE = (Deno.env.get('LIPILA_API_BASE') || 'https://api.lipila.dev/api/v1').replace(/\/$/, '');

export type Kind = 'collections' | 'disbursements';

export function isConfigured(): boolean {
  return Boolean(Deno.env.get('LIPILA_API_KEY'));
}

function headers(extra: Record<string, string> = {}) {
  return {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': Deno.env.get('LIPILA_API_KEY') || '',
    ...extra,
  };
}

export function callbackUrl(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/lipila-webhook`;
}

export type Outcome = 'completed' | 'failed' | 'pending';

export function mapStatus(raw: unknown): Outcome {
  const s = String(raw ?? '').toLowerCase();
  if (['successful', 'success', 'completed', 'complete', 'paid'].includes(s)) return 'completed';
  if (['failed', 'failure', 'rejected', 'declined', 'cancelled', 'canceled', 'expired', 'timeout', 'error'].includes(s)) return 'failed';
  return 'pending';
}

export async function create(kind: Kind, body: Record<string, unknown>) {
  const res = await fetch(`${LIPILA_BASE}/${kind}/mobile-money`, {
    method: 'POST',
    headers: headers({ callbackUrl: callbackUrl() }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, httpStatus: res.status, data };
}

/** Ask Lipila directly for the truth. Used by the webhook (never trust the payload) and by polling. */
export async function checkStatus(kind: Kind, referenceId: string) {
  const res = await fetch(`${LIPILA_BASE}/${kind}/check-status?referenceId=${encodeURIComponent(referenceId)}`, {
    headers: headers(),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    httpStatus: res.status,
    data,
    outcome: res.ok ? mapStatus((data as any)?.status) : ('pending' as Outcome),
  };
}
