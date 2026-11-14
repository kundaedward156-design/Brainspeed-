# Quivanta Quiz (Brainspeed) — Setup Guide

Everything secret lives in **Supabase Edge Function secrets**. The app only holds the public
Supabase URL + anon key. Money, scores, winners and roles are decided on the server.

```
Phone app ──► Edge Functions (secrets live here) ──► Postgres (RLS + SQL functions)
                 match · lipila-deposit · lipila-payout · lipila-status
                 lipila-webhook · send-sms (Africa's Talking) · notify-push
```

## 1. Database (5 min)

1. Supabase Dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. It is safe to re-run.
2. Make yourself admin (change the email):
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
   (If you sign up with a phone number, use `where phone = '+260971234567'`.)
3. Optional but recommended: **Database → Extensions → pg_cron → enable**, then run the schema again.
   It schedules a once-a-minute sweeper that refunds abandoned searches.
4. Add questions: Admin → Content → Questions. You need at least a few active ones before a match can start.

## 2. SMS provider — Africa's Talking (the part Supabase doesn't list)

Supabase's built-in SMS providers are Twilio, MessageBird, Vonage and Textlocal — there is no
Africa's Talking in the dropdown. The fix is Supabase's **Send SMS Hook**: Supabase still creates and
checks the code; our `send-sms` function just delivers the text through Africa's Talking.

**A. Africa's Talking**
1. Sign up at africastalking.com → create an **App**. Note the app **username**.
2. App → **Settings → API Key** → generate a key.
3. Testing: username is `sandbox`. The sandbox does **not** send real SMS — view messages in
   *Sandbox → SMS → Simulator* (add your phone number there).
4. Going live: create a production app, top up airtime, and (recommended) register a **Sender ID** for Zambia.
   Use the production username and key.

**B. Deploy the function and set secrets**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy send-sms --no-verify-jwt
```

**C. Create the hook (Supabase Dashboard)**
1. **Authentication → Hooks → Send SMS hook → Add hook** → type **HTTPS** →
   URL `https://<project-ref>.supabase.co/functions/v1/send-sms` → **Generate secret** → copy it (starts `v1,whsec_`) → Create.
2. **Authentication → Sign In / Providers → Phone → Enable** (leave the SMS provider as is; the hook replaces it).
3. Save secrets (copy `supabase/secrets.example.env` → `supabase/secrets.env`, fill it in):
```bash
supabase secrets set --env-file supabase/secrets.env
```
   Needed here: `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` (optional), `SEND_SMS_HOOK_SECRET`.

**D. Test without spending SMS:** Authentication → Phone → *Test phone numbers and OTPs*
(e.g. `260971111111=123456`). Log in with that number and code.

If SMS fails, open **Edge Functions → send-sms → Logs** — the Africa's Talking response is logged there.

## 3. Payments — Lipila

```bash
supabase functions deploy lipila-deposit lipila-payout lipila-status match
supabase functions deploy lipila-webhook notify-push --no-verify-jwt
```
Secrets (`supabase/secrets.env`): `LIPILA_API_KEY`, `LIPILA_API_BASE`
(sandbox `https://api.lipila.dev/api/v1`, live `https://api.lipila.io/api/v1`).

* **Deposit:** app → `lipila-deposit` → Lipila sends the mobile-money prompt → when approved,
  Lipila calls `lipila-webhook` (we re-check the status with Lipila before crediting) and the app also
  polls `lipila-status`. The wallet is only credited after confirmation, exactly once.
* **Withdraw:** money is held first, sent via Lipila, refunded automatically if it fails.
* The callback URL is sent with every request automatically:
  `https://<project-ref>.supabase.co/functions/v1/lipila-webhook`.

## 4. Push notifications (optional)

1. Set `PUSH_WEBHOOK_SECRET` in secrets. 2. **Database → Webhooks → Create** → table `notifications`,
event **Insert**, type *Supabase Edge Function* → `notify-push`, add header `x-webhook-secret: <same value>`.
3. Android production push also needs FCM credentials in EAS (`eas credentials`).

## 5. The app

1. EAS → Project → **Environment variables** (environment **production** *and* **preview**):
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These two are public by design.
   **Never** add Lipila / Africa's Talking / service-role keys here.
2. `eas build --platform android --profile preview`
3. Open the app as admin → Profile → **Admin dashboard → More → Links** and paste the Telegram link,
   Privacy Policy, Terms, WhatsApp and support email. They appear on Home and Profile immediately.

## 6. How a match works (server-side)

| Step | What happens |
| --- | --- |
| Confirm | Shows K20 competition fee + K3 platform fee = K23 |
| Find match | K23 is deducted and held; player joins the queue |
| Opponent found | Both get a request (20 s). Decline/timeout → that player is refunded, the other goes back to searching |
| Both accept | 4 s countdown, then 10 questions (change in `app_settings.scoring`) |
| Each question | Same question for both, 30 s. Server measures response time. Correct = 5 points, **fastest correct answer takes the point** |
| Finish | Higher score wins; tie → lower total time; still tied → draw and full refund. Winner gets K40 |

All numbers (fees, points, seconds, question count, withdrawal limits) live in the `app_settings` table.

## 7. Test checklist

- [ ] Log in with a test phone number + code
- [ ] Deposit K5 in Lipila sandbox → balance updates
- [ ] Two phones: find match → both accept → play → results → winner's balance +K40
- [ ] Ranks tab shows the Top 10 and recent winners
- [ ] Withdraw K10 → pending → completed
- [ ] Admin → Links → save Telegram → Home card opens it

## Notes & assumptions

* **Rebrand:** the splash artwork says *Quivanta Quiz*, so visible names use that. Change `AppConfig.name` in `constants/config.ts` to revert.
* **Points rule:** "award the point to the fastest correct answer" is implemented per question; set `fastest_takes_point` to `false` in the `scoring` setting if both correct players should get 5.
* **Splash on Android 12+:** the OS limits the *native* splash to an icon; the animated full-screen splash starts immediately after it.
* Lipila endpoint paths follow their public API (`/collections/mobile-money`, `/disbursements/mobile-money`, `/…/check-status`). If your account uses different paths, only `supabase/functions/_shared/lipila.ts` needs editing.


## Subjects, player counts and matchmaking (v3)

**What players see**
- Home: large banner carousel, "Continue playing" (their recent subjects), "Hot subjects" and every subject as a card with the number of players who have finished a match in it. A green "N waiting" badge shows when someone is searching right now.
- Each subject has its own page (cover, players, waiting now, the 10-question head-to-head, entry and prize) and its own matchmaking queue.
- Counts are real. A brand-new subject shows "New" until the first match is finished.

**What the admin does** (Admin → Content)
1. *Subjects*: add a subject with a name, colour, icon and optional cover image. Each row shows `questions/10` and turns "ready" at 10 active questions.
2. *Questions*: every question belongs to a subject. A subject cannot be played until it has at least 10 active questions (the number comes from Scoring → questions per match, default 10).
3. *Banners*: title, short line, button text and where it opens (a web link or a subject).

**Matchmaking rules** (settings row `matchmaking`, editable in SQL)
| Setting | Default | Meaning |
|---|---|---|
| `widen_after_s` | 25 | After this many seconds two waiting players from different subjects can be paired; their questions are mixed from both subjects. A "quick match" player pairs with anyone at once. |
| `timeout_s` | 90 | No opponent by now: the entry fee is refunded automatically and the player is told. |
| `nudges` | true | When someone starts waiting in a subject, up to 30 recent players of that subject get a notification (max one per 30 minutes each). |
| `nudge_cooldown_min` | 10 | Minimum gap between nudges for one subject. |

Example: `update public.app_settings set value = value || '{"timeout_s": 120}' where key = 'matchmaking';`

Players are never charged for a match that does not happen: refunds cover timeout, cancel, decline and an app closed while searching.

**Upgrading a database that already has v2**: run `supabase/upgrade-v3/u1_tables.sql` … `u6_permissions.sql` in order (all safe to re-run), then redeploy the `match` Edge Function.

## Online players and invites (v4)

Players on a subject page see who is online (masked names) and can invite them to a duel, in addition to normal searching.

1. Run the SQL pieces in `supabase/upgrade-v4/` in order: `w1_tables.sql` … `w7_permissions.sql` (or just run the new `schema.sql` on a fresh project).
2. Redeploy the `match` edge function (it has three new actions: `invite`, `invite_respond`, `invite_cancel`).
3. Rules: an invite holds the sender's entry fee for 60 seconds (`matchmaking.invite_ttl_s` in app settings). Declined, expired or cancelled invites refund automatically. Accepting charges the invitee and starts the match with both players ready.
4. A player counts as online if the app pinged in the last 45 seconds. Players can hide themselves in Profile → "Show me as online".
5. Invite limits: same player once per 2 minutes, at most 6 invites per 10 minutes.
