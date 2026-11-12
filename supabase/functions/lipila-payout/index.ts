// Withdraw wallet money to mobile money. Money is held atomically first; if Lipila
// definitively rejects the payout it is refunded. Unknown outcomes stay "pending"
// and are settled later by lipila-webhook / lipila-status.
// Secrets: LIPILA_API_KEY
import { adminClient, corsHeaders, friendlyError, json, requireUser } from '../_shared/http.ts';
import { normalizeZmPhone, parseAmount } from '../_shared/phone.ts';
import * as lipila from '../_shared/lipila.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    if (!user) return json({ success: false, error: 'Please sign in again.' }, 401);
    if (!lipila.isConfigured()) return json({ success: false, error: 'Withdrawals are not set up yet. Please try again later.' });

    const body = await req.json().catch(() => ({}));
    const amount = parseAmount(body.amount_zmw);
    const phone = normalizeZmPhone(body.phone);
    if (!amount) return json({ success: false, error: 'Enter a valid amount.' });
    if (!phone) return json({ success: false, error: 'Enter a valid MTN, Airtel or Zamtel number.' });

    const ref = `WTH-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error: holdErr } = await admin.rpc('begin_withdrawal', { p_uid: user.id, p_amount: amount, p_phone: phone, p_ref: ref });
    if (holdErr) return json({ success: false, error: friendlyError(holdErr.message) });

    let res;
    try {
      res = await lipila.create('disbursements', {
        referenceId: ref,
        amount,
        narration: 'Quivanta wallet withdrawal',
        accountNumber: phone,
        currency: 'ZMW',
      });
    } catch (e) {
      console.error('payout network error (left pending)', e);
      return json({ success: true, reference: ref, status: 'pending', message: 'Withdrawal submitted. You will be notified when it completes.' });
    }

    if (!res.ok && res.httpStatus >= 400 && res.httpStatus < 500) {
      await admin.rpc('settle_payment', { p_ref: ref, p_status: 'failed', p_response: res.data, p_reason: 'provider_rejected' });
      return json({ success: false, error: (res.data as any)?.message || 'The payout was rejected. Your money is back in your wallet.', reference: ref });
    }
    return json({ success: true, reference: ref, status: 'pending', message: 'Withdrawal submitted. You will be notified when the money arrives.' });
  } catch (e) {
    console.error('lipila-payout', e);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});
