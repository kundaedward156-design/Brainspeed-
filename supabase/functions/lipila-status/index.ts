// The app calls this after a deposit/withdrawal (and when the wallet opens) so balances
// update even if the webhook is delayed. Only touches the caller's own pending rows.
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts';
import * as lipila from '../_shared/lipila.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    if (!user) return json({ success: false, error: 'Please sign in again.' }, 401);
    if (!lipila.isConfigured()) return json({ success: true, settled: 0 });

    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: pending } = await admin
      .from('payment_transactions')
      .select('reference_id, type, created_at')
      .eq('user_id', user.id).eq('status', 'pending').gt('created_at', since)
      .order('created_at', { ascending: false }).limit(10);

    let settled = 0;
    for (const t of pending ?? []) {
      const kind: lipila.Kind = t.type === 'withdraw' ? 'disbursements' : 'collections';
      const check = await lipila.checkStatus(kind, t.reference_id);
      let outcome = check.outcome;
      // Lipila has never heard of it and it is old → the request never went through.
      if (!check.ok && check.httpStatus === 404 && Date.now() - new Date(t.created_at).getTime() > 10 * 60 * 1000) outcome = 'failed';
      // A deposit prompt nobody approved eventually dies.
      if (outcome === 'pending' && t.type === 'deposit' && Date.now() - new Date(t.created_at).getTime() > 30 * 60 * 1000) outcome = 'failed';
      if (outcome !== 'pending') {
        await admin.rpc('settle_payment', { p_ref: t.reference_id, p_status: outcome, p_response: check.data, p_reason: outcome === 'failed' ? 'provider_failed' : null });
        settled++;
      }
    }
    return json({ success: true, settled });
  } catch (e) {
    console.error('lipila-status', e);
    return json({ success: false, error: 'Could not refresh payments.' }, 500);
  }
});
