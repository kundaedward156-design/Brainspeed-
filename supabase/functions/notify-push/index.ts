// Sends a phone push notification whenever a row is inserted into `notifications`.
// Wire up: Dashboard → Database → Webhooks → table `notifications`, event INSERT,
// type "Supabase Edge Functions" → notify-push, add HTTP header  x-webhook-secret: <PUSH_WEBHOOK_SECRET>
import { adminClient, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) return json({ error: 'forbidden' }, 403);
  try {
    const { record } = await req.json();
    if (!record?.title) return json({ ok: true });
    const admin = adminClient();

    let q = admin.from('profiles').select('push_token').not('push_token', 'is', null).eq('push_enabled', true);
    if (record.user_id) q = q.eq('id', record.user_id);
    const { data } = await q.limit(5000);
    const tokens = (data ?? []).map((r: { push_token: string }) => r.push_token).filter((t: string) => t?.startsWith('ExponentPushToken'));

    for (let i = 0; i < tokens.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(tokens.slice(i, i + 100).map((to: string) => ({
          to, title: record.title, body: record.body, sound: 'default', data: record.data ?? {},
        }))),
      });
    }
    return json({ ok: true, sent: tokens.length });
  } catch (e) {
    console.error('notify-push', e);
    return json({ ok: false }, 500);
  }
});
