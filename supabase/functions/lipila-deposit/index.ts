// Supabase Edge Function: Lipila mobile money COLLECTION (deposit)
// Secrets: LIPILA_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy lipila-deposit --no-verify-jwt (or with JWT)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIPILA_BASE = Deno.env.get('LIPILA_API_BASE') || 'https://api.lipila.dev/api/v1';
const LIPILA_KEY = Deno.env.get('LIPILA_API_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

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

    // Normalize Zambian numbers to 260XXXXXXXXX
    if (phone.startsWith('0')) phone = '260' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);
    if (!phone.startsWith('260')) phone = '260' + phone;

    const referenceId = `DEP-${user.id.slice(0, 8)}-${Date.now()}`;

    // Record pending transaction
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await admin.from('payment_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount_zmw: amount,
      phone,
      reference_id: referenceId,
      status: 'pending',
      provider: 'lipila',
    });

    if (!LIPILA_KEY) {
      return json({
        success: false,
        error: 'Lipila is not configured. Set LIPILA_API_KEY secret on the Edge Function.',
      });
    }

    const res = await fetch(`${LIPILA_BASE}/collections/mobile-money`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': LIPILA_KEY,
      },
      body: JSON.stringify({
        referenceId,
        amount,
        narration: `Brainspeed wallet deposit`,
        accountNumber: phone,
        currency: 'ZMW',
        email: user.email || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await admin.from('payment_transactions').update({ status: 'failed', provider_response: data }).eq('reference_id', referenceId);
      return json({ success: false, error: data?.message || data?.error || 'Lipila collection failed', transaction_id: referenceId });
    }

    return json({
      success: true,
      transaction_id: referenceId,
      status: data?.status || 'Pending',
      message: 'Deposit initiated. Approve the prompt on your phone.',
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
