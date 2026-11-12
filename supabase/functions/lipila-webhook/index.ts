// Lipila → us. Deploy with --no-verify-jwt (see config.toml).
// The payload is NOT trusted: we only read the referenceId, then ask Lipila's API
// for the real status using our secret key before touching any money.
import { adminClient, json } from '../_shared/http.ts';
import * as lipila from '../_shared/lipila.ts';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const ref = String(body?.referenceId || '');
    if (!ref) return json({ ok: true });

    const kind: lipila.Kind = ref.startsWith('WTH-') ? 'disbursements' : 'collections';
    const admin = adminClient();
    const { data: tx } = await admin.from('payment_transactions').select('status').eq('reference_id', ref).maybeSingle();
    if (!tx || tx.status !== 'pending') return json({ ok: true });

    const check = await lipila.checkStatus(kind, ref);
    if (check.outcome !== 'pending') {
      await admin.rpc('settle_payment', { p_ref: ref, p_status: check.outcome, p_response: check.data, p_reason: check.outcome === 'failed' ? 'provider_failed' : null });
    }
    return json({ ok: true });
  } catch (e) {
    console.error('lipila-webhook', e);
    return json({ ok: false }, 500);
  }
});
