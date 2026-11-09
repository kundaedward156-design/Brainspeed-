// Exchange OTP session token for a real Supabase session (access + refresh tokens)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  try {
    const { exchange_token, phone } = await req.json();
    if (!exchange_token) return json({ success: false, error: 'exchange_token required' });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: row } = await admin
      .from('otp_codes')
      .select('*')
      .eq('code', exchange_token)
      .eq('purpose', 'session_exchange')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!row?.user_id) return json({ success: false, error: 'Invalid or expired session token' });

    await admin.from('otp_codes').update({ used: true }).eq('id', row.id);

    // Generate a magic link and extract tokens (admin generateLink)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: (await admin.auth.admin.getUserById(row.user_id)).data.user?.email || '',
    });
    if (linkErr || !linkData) {
      // Fallback: set a random password and return credentials for client sign-in
      const tempPass = crypto.randomUUID() + 'Aa1!';
      await admin.auth.admin.updateUserById(row.user_id, { password: tempPass });
      const user = (await admin.auth.admin.getUserById(row.user_id)).data.user;
      return json({
        success: true,
        email: user?.email,
        temp_password: tempPass,
        user_id: row.user_id,
      });
    }

    // Prefer hashed_token if available for verifyOtp
    const props = (linkData as any).properties || {};
    return json({
      success: true,
      user_id: row.user_id,
      email: props.email || linkData.user?.email,
      hashed_token: props.hashed_token,
      verification_type: 'magiclink',
      action_link: props.action_link,
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
