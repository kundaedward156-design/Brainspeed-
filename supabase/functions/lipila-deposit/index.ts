// Start a mobile-money deposit. The wallet is credited ONLY after Lipila confirms
// (webhook or lipila-status), never here.
// Secrets: LIPILA_API_KEY (+ optional LIPILA_API_BASE)
import { adminClient, corsHeaders, friendlyError, json, requireUser } from '../_shared/http.ts';
import { normalizeZmPhone, parseAmount } from '../_shared/phone.ts';
import * as lipila from '../_shared/lipila.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    if (!user) return json({ success: false, error: 'Please sign in again.' }, 401);
    if (!lipila.isConfigured()) return json({ success: false, error: 'Payments are not set up yet. Please try again later.' });

    const body = await req.json().catch(() => ({}));
    const amount = parseAmount(body.amount_zmw);
    const phone = normalizeZmPhone(body.phone);
    if (!amount) return json({ success: false, error: 'Enter a valid amount.' });
    if (!phone) return json({ success: false, error: 'Enter a valid MTN, Airtel or Zamtel number.' });

    const ref = `DEP-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error: beginErr } = await admin.rpc('begin_deposit', { p_uid: user.id, p_amount: amount, p_phone: phone, p_ref: ref });
    if (beginErr) return json({ success: false, error: friendlyError(beginErr.message) });

    const res = await lipila.create('collections', {
      referenceId: ref,
      amount,
      narration: 'Quivanta wallet deposit',
      accountNumber: phone,
      currency: 'ZMW',
    });
    if (!res.ok) {
      await admin.rpc('settle_payment', { p_ref: ref, p_status: 'failed', p_response: res.data, p_reason: 'provider_rejected' });
      return json({ success: false, error: (res.data as any)?.message || 'The payment provider rejected the request.', reference: ref });
    }
    return json({
      success: true,
      reference: ref,
      transaction_id: ref,
      message: 'Approve the payment prompt on your phone to complete the deposit.',
    });
  } catch (e) {
    console.error('lipila-deposit', e);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});
