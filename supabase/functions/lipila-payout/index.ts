// Supabase Edge Function: Lipila mobile money DISBURSEMENT (withdraw)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIPILA_BASE = Deno.env.get('LIPILA_API_BASE') || 'https://api.lipila.dev/api/v1';
const LIPILA_KEY = Deno.env.get('LIPILA_API_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json();
    const amount = Number(body.amount_zmw);
    let phone = String(body.phone || '').replace(/\s+/g, '');
    if (!amount || amount < 1) return json({ success: false, error: 'Invalid amount' });
    if (!phone) return json({ success: false, error: 'Phone required' });

    if (phone.startsWith('0')) phone = '260' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);
    if (!phone.startsWith('260')) phone = '260' + phone;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check balance
    const { data: profile } = await admin.from('profiles').select('balance_zmw').eq('id', user.id).single();
    if (!profile || Number(profile.balance_zmw) < amount) {
      return json({ success: false, error: 'Insufficient balance' });
    }

    const referenceId = `WTH-${user.id.slice(0, 8)}-${Date.now()}`;

    // Deduct first (hold)
    const { error: dedErr } = await admin.rpc('deduct_balance', { uid: user.id, amount });
    if (dedErr) {
      // Fallback direct update
      const newBal = Number(profile.balance_zmw) - amount;
      await admin.from('profiles').update({ balance_zmw: newBal }).eq('id', user.id);
    }

    await admin.from('payment_transactions').insert({
      user_id: user.id,
      type: 'withdraw',
      amount_zmw: amount,
      phone,
      reference_id: referenceId,
      status: 'pending',
      provider: 'lipila',
    });

    if (!LIPILA_KEY) {
      // Rollback
      await admin.rpc('credit_balance', { uid: user.id, amount }).catch(() => {});
      return json({ success: false, error: 'Lipila is not configured. Set LIPILA_API_KEY secret.' });
    }

    const res = await fetch(`${LIPILA_BASE}/disbursements/mobile-money`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': LIPILA_KEY,
      },
      body: JSON.stringify({
        referenceId,
        amount,
        narration: 'Brainspeed wallet withdrawal',
        accountNumber: phone,
        currency: 'ZMW',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await admin.rpc('credit_balance', { uid: user.id, amount }).catch(() => {});
      await admin.from('payment_transactions').update({ status: 'failed', provider_response: data }).eq('reference_id', referenceId);
      return json({ success: false, error: data?.message || 'Payout failed', transaction_id: referenceId });
    }

    return json({
      success: true,
      transaction_id: referenceId,
      status: data?.status || 'Pending',
      message: 'Withdrawal initiated. Funds will arrive shortly.',
    });
  } catch (e: any) {
    return json({ success: false, error: e?.message || 'Server error' }, 500);
  }
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}
