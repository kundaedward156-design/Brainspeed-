// Africa's Talking SMS OTP
// Secrets: AT_USERNAME, AT_API_KEY
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  try {
    const body = await req.json();
    let phone = String(body.phone || '').replace(/\s+/g, '');
    if (!phone) return json({ success: false, error: 'Phone required' });

    if (phone.startsWith('0')) phone = '260' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);
    if (!phone.startsWith('260')) phone = '260' + phone;
    const e164 = '+' + phone;

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Invalidate previous
    await admin.from('otp_codes').update({ used: true }).eq('phone', e164).eq('used', false);
    await admin.from('otp_codes').insert({ phone: e164, code: otp, expires_at: expires });

    const username = Deno.env.get('AT_USERNAME') || 'sandbox';
    const apiKey = Deno.env.get('AT_API_KEY') || '';

    if (!apiKey) {
      // Dev fallback: still store OTP so verify works; log for testing
      console.log(`[DEV OTP] ${e164} => ${otp}`);
      return json({
        success: true,
        message: 'OTP generated (AT not configured — check function logs in sandbox).',
        // Never return OTP in production responses
        debug_otp: Deno.env.get('ALLOW_DEBUG_OTP') === 'true' ? otp : undefined,
      });
    }

    const form = new URLSearchParams();
    form.set('username', username);
    form.set('to', e164);
    form.set('message', `Your Brainspeed login code is ${otp}. Valid for 10 minutes.`);

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ success: false, error: data?.message || 'SMS send failed' });
    }

    return json({ success: true, message: 'OTP sent via SMS' });
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
