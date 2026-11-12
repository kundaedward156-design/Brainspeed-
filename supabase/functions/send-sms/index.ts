// Supabase Auth "Send SMS" hook → Africa's Talking.
// Supabase has no built-in Africa's Talking provider, so Auth calls this function
// instead of Twilio. Auth generates + verifies the OTP; we only deliver the text.
//
// Secrets: SEND_SMS_HOOK_SECRET, AT_USERNAME, AT_API_KEY, AT_SENDER_ID (optional)
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const hookError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  const payload = await req.text();
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') || '').replace('v1,whsec_', '');
  let event: { user: { phone: string }; sms: { otp: string } };
  try {
    event = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as typeof event;
  } catch {
    return hookError(401, 'Invalid hook signature');
  }

  const username = Deno.env.get('AT_USERNAME') || 'sandbox';
  const apiKey = Deno.env.get('AT_API_KEY') || '';
  if (!apiKey) return hookError(500, 'AT_API_KEY secret is not set');

  const to = '+' + String(event.user.phone).replace(/^\+/, '');
  const form = new URLSearchParams({
    username,
    to,
    message: `Your Quivanta Quiz code is ${event.sms.otp}. It expires in 10 minutes. Never share it.`,
  });
  const sender = Deno.env.get('AT_SENDER_ID');
  if (sender) form.set('from', sender);

  // The sandbox app lives on a different host from production.
  const host = username === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
  try {
    const res = await fetch(`https://${host}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    const rcpt = data?.SMSMessageData?.Recipients?.[0];
    // statusCode 100 Processed / 101 Sent / 102 Queued
    if (!res.ok || !rcpt || ![100, 101, 102].includes(Number(rcpt.statusCode))) {
      console.error('Africa\'s Talking rejected the SMS', res.status, JSON.stringify(data));
      return hookError(502, rcpt?.status || data?.SMSMessageData?.Message || 'SMS provider rejected the message');
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-sms failed', e);
    return hookError(500, 'Could not reach the SMS provider');
  }
});
