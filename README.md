# Brainspeed

Think fast. Compete smart. Get rewarded.

Complete Expo app: player + admin UI, Supabase client services, UUID schema, banner/reward rotation + image upload.

## Expo project

Linked in `app.json` to the Expo org **edwardkunda156s-team**:

| Field | Value |
| --- | --- |
| name | Brainspeed |
| slug | edwardkunda156 |
| owner | edwardkunda156s-team |
| extra.eas.projectId | b845ebd3-bb3d-46b3-b194-a3f7720091d3 |

That is what EAS uses to find the project when you run `eas build`. You do not need `eas init` again.

## Android preview (do not change these)

Pinned so the Android preview APK does not fail on Kotlin / SDK mismatch:

- Expo SDK 52 + React Native **0.76.3** + React **18.3.1**
- Node **22.13.0** (`.nvmrc` + every EAS profile)
- Kotlin **1.9.25**, compileSdk **35**, targetSdk **34**, minSdk **24**
- New Architecture **off**
- `eas build --platform android --profile preview` → internal APK

## Setup (once)

1. Create a Supabase project.
2. SQL Editor → run `supabase/schema.sql`.
3. Storage → create public buckets: `banners`, `rewards`.
4. Auth → enable Email provider.
5. Copy Project URL + anon key.

### Environment (EAS + local `.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_LIPILA_MERCHANT_ID=
EXPO_PUBLIC_LIPILA_API_BASE=
```

Promote an admin (SQL):

```sql
update public.profiles set role = 'admin' where email = 'you@gmail.com';
```

```bash
npm install
npx expo start
eas build --platform android --profile preview
```

## What is complete in the app code

- Splash (dark) + light login/register/home/tabs matching product design
- Email registration/login via Supabase Auth
- All services query real tables when env is set
- Home banners auto-rotate; admin uploads images
- Rewards auto-rotate; admin uploads images
- Competition matchmaking + realtime subscription hooks
- Admin dashboard stats from live counts
- UUID profile ids = auth.users.id
- Lipila via Edge Function invoke (deposit/payout)

## Lipila Edge Functions (server)

Deploy `lipila-deposit` / `lipila-payout` with secret `LIPILA_API_KEY` — never in the APK.
