// Verify Africa's Talking OTP and sign in / create user via service role
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  try {
    const body = await req.json();
    let phone = String(body.phone || '').replace(/\s+/g, '');
    const code = String(body.code || '').trim();
    const full_name = String(body.full_name || '').trim();

    if (!phone || !code) return json({ success: false, error: 'Phone and code required' });

    if (phone.startsWith('0')) phone = '260' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);
    if (!phone.startsWith('260')) phone = '260' + phone;
    const e164 = '+' + phone;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: otpRow } = await admin
      .from('otp_codes')
      .select('*')
      .eq('phone', e164)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return json({ success: false, error: 'Invalid or expired code' });
    }

    await admin.from('otp_codes').update({ used: true }).eq('id', otpRow.id);

    // Find or create auth user by phone
    // Use synthetic email for phone-only accounts so Supabase Auth works
    const syntheticEmail = `phone_${phone}@brainspeed.local`;

    let userId: string | null = null;
    let isNew = false;

    // Try find existing profile by phone
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', e164)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    } else {
      // Create auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        phone: e164,
        phone_confirm: true,
        user_metadata: { full_name: full_name || phone, phone: e164 },
      });
      if (createErr || !created.user) {
        // Maybe already exists by email
        const { data: listed } = await admin.auth.admin.listUsers();
        const found = listed?.users?.find((u) => u.email === syntheticEmail || u.phone === e164);
        if (found) {
          userId = found.id;
        } else {
          return json({ success: false, error: createErr?.message || 'Could not create user' });
        }
      } else {
        userId = created.user.id;
        isNew = true;
      }
      // Ensure profile has phone
      if (userId) {
        await admin.from('profiles').upsert({
          id: userId,
          full_name: full_name || phone,
          phone: e164,
          email: syntheticEmail,
        });
      }
    }

    // Generate a session: use magic link style or return custom token is limited.
    // Issue a temporary password and sign-in on client is fragile.
    // Better: return a one-time exchange token stored in DB.
    const sessionToken = crypto.randomUUID() + crypto.randomUUID();
    await admin.from('otp_codes').insert({
      phone: e164,
      code: sessionToken,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: false,
      purpose: 'session_exchange',
      user_id: userId,
    });

    return json({
      success: true,
      user_id: userId,
      is_new: isNew,
      exchange_token: sessionToken,
      phone: e164,
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
