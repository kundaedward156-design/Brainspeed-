-- ============================================================================
-- Quivanta Quiz — complete database schema (v3: subjects, per-subject matchmaking)
--
-- SAFE TO RE-RUN. Run the whole file once in: Supabase Dashboard → SQL Editor.
--
-- Design rules
--   * The mobile app NEVER changes money, scores, winners or roles directly.
--   * All of that happens in the SQL functions below, which can only be called
--     by Edge Functions (service_role). Players have no EXECUTE on them.
--   * Players cannot read the questions table (so correct answers never leave
--     the server). Questions reach the app one at a time through the match flow.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'admin')),
  wins int not null default 0,
  losses int not null default 0,
  total_score int not null default 0,
  balance_zmw numeric(12,2) not null default 0 check (balance_zmw >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists draws int not null default 0;
alter table public.profiles add column if not exists games_played int not null default 0;
alter table public.profiles add column if not exists correct_answers int not null default 0;
alter table public.profiles add column if not exists push_token text;
alter table public.profiles add column if not exists push_enabled boolean not null default true;
create unique index if not exists profiles_phone_unique on public.profiles (phone) where phone is not null;
create index if not exists profiles_rank_idx on public.profiles (total_score desc, wins desc);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists accent text;
alter table public.categories add column if not exists last_nudge_at timestamptz;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  text text not null,
  image_url text,
  options jsonb not null default '[]',
  correct_index int not null default 0,
  difficulty text not null default 'medium',
  time_limit_sec int not null default 30,
  points int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid references public.categories (id) on delete set null,
  question_ids uuid[] not null default '{}',
  question_count int not null default 0,
  entry_fee_zmw numeric(12,2) not null default 23,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes (id),
  player1_id uuid references public.profiles (id),
  player2_id uuid references public.profiles (id),
  status text not null default 'pending_accept',
  player1_score int not null default 0,
  player2_score int not null default 0,
  winner_id uuid references public.profiles (id),
  entry_fee_zmw numeric(12,2) not null default 23,
  platform_fee_zmw numeric(12,2) not null default 6,
  prize_zmw numeric(12,2) not null default 40,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.competitions add column if not exists competition_fee_zmw numeric(12,2) not null default 20;
alter table public.competitions add column if not exists question_ids uuid[] not null default '{}';
alter table public.competitions add column if not exists current_index int not null default 0;
alter table public.competitions add column if not exists question_started_at timestamptz;
alter table public.competitions add column if not exists question_seconds int not null default 30;
alter table public.competitions add column if not exists p1_accepted boolean not null default false;
alter table public.competitions add column if not exists p2_accepted boolean not null default false;
alter table public.competitions add column if not exists accept_deadline timestamptz;
alter table public.competitions add column if not exists player1_correct int not null default 0;
alter table public.competitions add column if not exists player2_correct int not null default 0;
alter table public.competitions add column if not exists player1_time_ms bigint not null default 0;
alter table public.competitions add column if not exists player2_time_ms bigint not null default 0;
alter table public.competitions add column if not exists is_draw boolean not null default false;
alter table public.competitions add column if not exists cancelled_reason text;
alter table public.competitions add column if not exists category_id uuid references public.categories (id) on delete set null;
create index if not exists competitions_cat_idx on public.competitions (category_id, status);
create index if not exists competitions_p1_idx on public.competitions (player1_id, status);
create index if not exists competitions_p2_idx on public.competitions (player2_id, status);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions (id) on delete cascade,
  player_id uuid references public.profiles (id),
  question_id uuid references public.questions (id),
  selected_index int,
  is_correct boolean not null default false,
  time_taken_ms int not null default 0,
  points_earned int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.answers add column if not exists question_index int not null default 0;
create unique index if not exists answers_one_per_question
  on public.answers (competition_id, player_id, question_index);

create table if not exists public.match_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  quiz_id uuid,
  fee_zmw numeric(12,2) not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.match_queue add column if not exists category_id uuid references public.categories (id) on delete set null;
create index if not exists questions_cat_idx on public.questions (category_id) where is_active;

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  amount_zmw numeric(12,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- In-game money ledger (entry fees, refunds, prizes)
create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  competition_id uuid references public.competitions (id),
  reward_id uuid references public.rewards (id),
  type text not null,
  amount_zmw numeric(12,2) not null,
  balance_after_zmw numeric(12,2) not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- Mobile-money movements (deposit / withdraw) via Lipila
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  type text not null check (type in ('deposit', 'withdraw', 'entry_fee', 'prize')),
  amount_zmw numeric(12,2) not null,
  phone text,
  reference_id text unique,
  status text not null default 'pending',
  provider text not null default 'lipila',
  provider_response jsonb,
  failure_reason text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_tx_user_idx on public.payment_transactions (user_id, created_at desc);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  button_text text,
  destination text,
  priority int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  title text not null,
  body text not null,
  type text not null default 'system',
  is_read boolean not null default false,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- app_settings: key/value. Older installs had a different shape → rebuild it.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'app_settings' and column_name = 'id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'app_settings' and column_name = 'key') then
    drop table public.app_settings;
  end if;
end $$;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('platform_fees', '{"platform_fee_zmw": 3, "competition_fee_zmw": 20, "default_entry_fee_zmw": 23}'),
  ('scoring',       '{"points_per_correct": 5, "question_seconds": 30, "question_count": 10, "fastest_takes_point": true}'),
  ('wallet',        '{"min_deposit": 5, "max_deposit": 5000, "min_withdraw": 10, "max_withdraw": 5000}'),
  ('links',         '{"telegram_url": "", "privacy_url": "", "terms_url": "", "support_email": "", "whatsapp_url": ""}'),
  ('maintenance',   '{"enabled": false, "message": ""}'),
  ('matchmaking',   '{"widen_after_s": 25, "timeout_s": 90, "nudges": true, "nudge_cooldown_min": 10}')
on conflict (key) do nothing;

-- Community link supplied by the client (only fills it in if the admin has not set one)
update public.app_settings
   set value = value || '{"telegram_url": "https://t.me/+Xql6LOBoHbo3ZTRk"}'::jsonb
 where key = 'links' and coalesce(value->>'telegram_url', '') = '';

-- ---------------------------------------------------------------------------
-- 2. New-user trigger (works for phone sign-in and email sign-up)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text := nullif(new.phone, '');
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'Player'),
    new.email,
    case when v_phone is not null then '+' || ltrim(v_phone, '+') end,
    'player'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.setting(k text, d jsonb default '{}')
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = k), d);
$$;

create or replace function public.mask_name(n text)
returns text language sql immutable as $$
  select case
    when n is null or btrim(n) = '' then 'Player'
    when n ~ '^[+0-9 ]{7,}$' then left(regexp_replace(n, '\D', '', 'g'), 5) || '•••' || right(regexp_replace(n, '\D', '', 'g'), 2)
    else n
  end;
$$;

create or replace function public._notify(p_uid uuid, p_title text, p_body text, p_type text, p_data jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, type, data) values (p_uid, p_title, p_body, p_type, p_data);
$$;

-- ---------------------------------------------------------------------------
-- 4. Wallet primitives (service_role only)
-- ---------------------------------------------------------------------------
drop function if exists public.deduct_balance(uuid, numeric);
drop function if exists public.credit_balance(uuid, numeric);
drop function if exists public.increment_wins(uuid);
drop function if exists public.increment_losses(uuid);

create or replace function public._debit(p_uid uuid, p_amt numeric, p_comp uuid, p_type text)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  update public.profiles set balance_zmw = balance_zmw - p_amt, updated_at = now()
   where id = p_uid and balance_zmw >= p_amt returning balance_zmw into v_bal;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into public.reward_transactions (user_id, competition_id, type, amount_zmw, balance_after_zmw)
  values (p_uid, p_comp, p_type, -p_amt, v_bal);
  return v_bal;
end;
$$;

create or replace function public._credit(p_uid uuid, p_amt numeric, p_comp uuid, p_type text)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  update public.profiles set balance_zmw = balance_zmw + p_amt, updated_at = now()
   where id = p_uid returning balance_zmw into v_bal;
  insert into public.reward_transactions (user_id, competition_id, type, amount_zmw, balance_after_zmw)
  values (p_uid, p_comp, p_type, p_amt, v_bal);
  return v_bal;
end;
$$;

-- Start a deposit: just records a pending row (money is credited only after Lipila confirms)
create or replace function public.begin_deposit(p_uid uuid, p_amount numeric, p_phone text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare w jsonb := public.setting('wallet');
begin
  if p_amount < coalesce((w->>'min_deposit')::numeric, 5) then
    raise exception 'Minimum deposit is K%', coalesce(w->>'min_deposit', '5'); end if;
  if p_amount > coalesce((w->>'max_deposit')::numeric, 5000) then
    raise exception 'Maximum deposit is K%', coalesce(w->>'max_deposit', '5000'); end if;
  insert into public.payment_transactions (user_id, type, amount_zmw, phone, reference_id, status)
  values (p_uid, 'deposit', p_amount, p_phone, p_ref, 'pending');
end;
$$;

-- Start a withdrawal: validates + holds the money atomically
create or replace function public.begin_withdrawal(p_uid uuid, p_amount numeric, p_phone text, p_ref text)
returns numeric language plpgsql security definer set search_path = public as $$
declare w jsonb := public.setting('wallet'); v_bal numeric;
begin
  if p_amount < coalesce((w->>'min_withdraw')::numeric, 10) then
    raise exception 'Minimum withdrawal is K%', coalesce(w->>'min_withdraw', '10'); end if;
  if p_amount > coalesce((w->>'max_withdraw')::numeric, 5000) then
    raise exception 'Maximum withdrawal is K%', coalesce(w->>'max_withdraw', '5000'); end if;
  if (select count(*) from public.payment_transactions
       where user_id = p_uid and type = 'withdraw' and status = 'pending') >= 3 then
    raise exception 'You already have pending withdrawals. Please wait for them to finish.';
  end if;
  update public.profiles set balance_zmw = balance_zmw - p_amount, updated_at = now()
   where id = p_uid and balance_zmw >= p_amount returning balance_zmw into v_bal;
  if not found then raise exception 'Insufficient balance'; end if;
  insert into public.payment_transactions (user_id, type, amount_zmw, phone, reference_id, status)
  values (p_uid, 'withdraw', p_amount, p_phone, p_ref, 'pending');
  return v_bal;
end;
$$;

-- Final status from Lipila. Idempotent: safe to call from webhook AND polling.
create or replace function public.settle_payment(p_ref text, p_status text, p_response jsonb default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.payment_transactions; v_bal numeric;
begin
  select * into t from public.payment_transactions where reference_id = p_ref for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', t.status, 'already', true);
  end if;

  if p_status = 'completed' then
    if t.type = 'deposit' then
      update public.profiles set balance_zmw = balance_zmw + t.amount_zmw, updated_at = now()
       where id = t.user_id returning balance_zmw into v_bal;
      perform public._notify(t.user_id, 'Deposit confirmed',
        'K' || trim(to_char(t.amount_zmw, 'FM999999990.00')) || ' has been added to your wallet.', 'deposit',
        jsonb_build_object('reference', p_ref));
    else
      perform public._notify(t.user_id, 'Withdrawal confirmed',
        'K' || trim(to_char(t.amount_zmw, 'FM999999990.00')) || ' was sent to ' || coalesce(t.phone, 'your mobile money') || '.', 'withdrawal',
        jsonb_build_object('reference', p_ref));
    end if;
    update public.payment_transactions
       set status = 'completed', provider_response = p_response, settled_at = now(), updated_at = now()
     where id = t.id;
    return jsonb_build_object('ok', true, 'status', 'completed');
  elsif p_status = 'failed' then
    if t.type = 'withdraw' then
      update public.profiles set balance_zmw = balance_zmw + t.amount_zmw, updated_at = now() where id = t.user_id;
      perform public._notify(t.user_id, 'Withdrawal failed',
        'Your withdrawal of K' || trim(to_char(t.amount_zmw, 'FM999999990.00')) || ' could not be completed. The money is back in your wallet.', 'withdrawal',
        jsonb_build_object('reference', p_ref));
    else
      perform public._notify(t.user_id, 'Deposit not completed',
        'Your deposit of K' || trim(to_char(t.amount_zmw, 'FM999999990.00')) || ' was not approved. You have not been charged.', 'deposit',
        jsonb_build_object('reference', p_ref));
    end if;
    update public.payment_transactions
       set status = 'failed', provider_response = p_response, failure_reason = p_reason, settled_at = now(), updated_at = now()
     where id = t.id;
    return jsonb_build_object('ok', true, 'status', 'failed');
  end if;
  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Matchmaking + match engine (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public._entry_fee()
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((public.setting('platform_fees')->>'competition_fee_zmw')::numeric, 20)
       + coalesce((public.setting('platform_fees')->>'platform_fee_zmw')::numeric, 3);
$$;

-- Put a player (whose fee is already held) back into the queue and try to pair
create or replace function public._enqueue(p_uid uuid, p_fee numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.match_queue (user_id, fee_zmw) values (p_uid, p_fee)
  on conflict (user_id) do update set last_seen = now();
  perform public._try_pair();
end;
$$;

create or replace function public._try_pair()
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.match_queue; b public.match_queue;
  v_ids uuid[]; v_pool uuid[]; v_comp uuid;
  sc jsonb := public.setting('scoring'); fees jsonb := public.setting('platform_fees'); mm jsonb := public.setting('matchmaking');
  v_count int := coalesce((sc->>'question_count')::int, 10);
  v_secs int := coalesce((sc->>'question_seconds')::int, 30);
  v_cfee numeric := coalesce((fees->>'competition_fee_zmw')::numeric, 20);
  v_pfee numeric := coalesce((fees->>'platform_fee_zmw')::numeric, 3);
  v_widen interval := make_interval(secs => coalesce((mm->>'widen_after_s')::int, 25));
begin
  for a in select * from public.match_queue where last_seen > now() - interval '15 seconds' order by created_at loop
    continue when not exists (select 1 from public.match_queue where user_id = a.user_id);

    select * into b from public.match_queue q
     where q.user_id <> a.user_id and q.last_seen > now() - interval '15 seconds'
       and ( q.category_id is not distinct from a.category_id
             or q.category_id is null or a.category_id is null
             or (a.created_at < now() - v_widen and q.created_at < now() - v_widen) )
     order by (q.category_id is not distinct from a.category_id) desc, q.created_at
     limit 1;
    continue when not found;

    v_pool := case
      when a.category_id is null and b.category_id is null then null
      when a.category_id is not distinct from b.category_id then array[a.category_id]
      when a.category_id is null then array[b.category_id]
      when b.category_id is null then array[a.category_id]
      else array[a.category_id, b.category_id] end;

    select array_agg(id) into v_ids from (
      select id from public.questions
       where is_active and (v_pool is null or category_id = any(v_pool))
       order by random() limit v_count) q;
    continue when coalesce(array_length(v_ids, 1), 0) = 0;

    insert into public.competitions (
      player1_id, player2_id, status, entry_fee_zmw, competition_fee_zmw, platform_fee_zmw, prize_zmw,
      question_ids, question_seconds, accept_deadline, category_id
    ) values (
      a.user_id, b.user_id, 'pending_accept', v_cfee + v_pfee, v_cfee, v_pfee * 2, v_cfee * 2,
      v_ids, v_secs, now() + interval '20 seconds', coalesce(a.category_id, b.category_id)
    ) returning id into v_comp;

    delete from public.match_queue where user_id in (a.user_id, b.user_id);
    perform public._notify(a.user_id, 'Match found', 'An opponent is ready. Accept to start the match.', 'match_found', jsonb_build_object('competition_id', v_comp));
    perform public._notify(b.user_id, 'Match found', 'An opponent is ready. Accept to start the match.', 'match_found', jsonb_build_object('competition_id', v_comp));
  end loop;
end;
$$;

create or replace function public._nudge_category(p_cat uuid, p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  mm jsonb := public.setting('matchmaking');
  v_cool interval := make_interval(mins => coalesce((mm->>'nudge_cooldown_min')::int, 10));
  v_name text; v_n int;
  v_prize numeric := coalesce((public.setting('platform_fees')->>'competition_fee_zmw')::numeric, 20) * 2;
begin
  if p_cat is null or coalesce((mm->>'nudges')::boolean, true) is not true then return; end if;
  if not exists (select 1 from public.match_queue where user_id = p_uid) then return; end if;

  select name into v_name from public.categories
   where id = p_cat and (last_nudge_at is null or last_nudge_at < now() - v_cool);
  if not found then return; end if;

  insert into public.notifications (user_id, title, body, type, data)
  select p.id, 'Someone is waiting in ' || v_name,
         'Jump in now and play for K' || trim(to_char(v_prize, 'FM999999990.00')) || '.',
         'nudge', jsonb_build_object('category_id', p_cat)
    from public.profiles p
   where p.id <> p_uid and p.push_enabled
     and exists (select 1 from public.competitions c
                  where c.category_id = p_cat and c.created_at > now() - interval '14 days'
                    and p.id in (c.player1_id, c.player2_id))
     and not exists (select 1 from public.match_queue q where q.user_id = p.id)
     and not exists (select 1 from public.competitions c2
                      where c2.status in ('pending_accept', 'active') and p.id in (c2.player1_id, c2.player2_id))
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'nudge' and n.created_at > now() - interval '30 minutes')
   limit 30;
  get diagnostics v_n = row_count;
  if v_n > 0 then update public.categories set last_nudge_at = now() where id = p_cat; end if;
end;
$$;

-- Close one question (fill timeouts), then move on or finish
create or replace function public._advance(p_comp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.competitions; v_total int; v_deadline timestamptz; v_n int; v_next timestamptz;
  v_early boolean; i int := 0;
begin
  loop
    i := i + 1; exit when i > 60;
    select * into c from public.competitions where id = p_comp for update;
    exit when not found or c.status <> 'active';
    v_total := coalesce(array_length(c.question_ids, 1), 0);
    v_deadline := c.question_started_at + make_interval(secs => c.question_seconds);
    select count(*) into v_n from public.answers where competition_id = c.id and question_index = c.current_index;
    v_early := v_n >= 2;
    exit when not v_early and now() <= v_deadline + interval '1 second';

    -- timeouts for anyone who did not answer
    insert into public.answers (competition_id, player_id, question_id, selected_index, is_correct, time_taken_ms, points_earned, question_index)
    select c.id, pl, c.question_ids[c.current_index + 1], null, false, c.question_seconds * 1000, 0, c.current_index
      from unnest(array[c.player1_id, c.player2_id]) pl
     where not exists (select 1 from public.answers a where a.competition_id = c.id and a.player_id = pl and a.question_index = c.current_index);

    if c.current_index + 1 >= v_total then
      perform public._finalize(c.id);
      exit;
    end if;
    v_next := case when v_early then now() else v_deadline end + interval '2 seconds';
    update public.competitions set current_index = c.current_index + 1, question_started_at = v_next where id = c.id;
  end loop;
end;
$$;

create or replace function public._finalize(p_comp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.competitions;
  s1 int; s2 int; k1 int; k2 int; t1 bigint; t2 bigint; w uuid; draw boolean := false; loser uuid;
begin
  select * into c from public.competitions where id = p_comp for update;
  if not found or c.status = 'completed' then return; end if;

  select coalesce(sum(points_earned),0), count(*) filter (where is_correct), coalesce(sum(time_taken_ms),0)
    into s1, k1, t1 from public.answers where competition_id = c.id and player_id = c.player1_id;
  select coalesce(sum(points_earned),0), count(*) filter (where is_correct), coalesce(sum(time_taken_ms),0)
    into s2, k2, t2 from public.answers where competition_id = c.id and player_id = c.player2_id;

  if s1 > s2 then w := c.player1_id;
  elsif s2 > s1 then w := c.player2_id;
  elsif t1 < t2 then w := c.player1_id;
  elsif t2 < t1 then w := c.player2_id;
  else draw := true; end if;

  update public.competitions set
    status = 'completed', completed_at = now(), winner_id = w, is_draw = draw,
    player1_score = s1, player2_score = s2, player1_correct = k1, player2_correct = k2,
    player1_time_ms = t1, player2_time_ms = t2
  where id = c.id;

  if draw then
    perform public._credit(c.player1_id, c.entry_fee_zmw, c.id, 'entry_refund');
    perform public._credit(c.player2_id, c.entry_fee_zmw, c.id, 'entry_refund');
  else
    perform public._credit(w, c.prize_zmw, c.id, 'prize');
    loser := case when w = c.player1_id then c.player2_id else c.player1_id end;
  end if;

  update public.profiles set
    games_played = games_played + 1, total_score = total_score + s1, correct_answers = correct_answers + k1,
    wins = wins + (case when w = c.player1_id then 1 else 0 end),
    losses = losses + (case when not draw and w <> c.player1_id then 1 else 0 end),
    draws = draws + (case when draw then 1 else 0 end), updated_at = now()
  where id = c.player1_id;
  update public.profiles set
    games_played = games_played + 1, total_score = total_score + s2, correct_answers = correct_answers + k2,
    wins = wins + (case when w = c.player2_id then 1 else 0 end),
    losses = losses + (case when not draw and w <> c.player2_id then 1 else 0 end),
    draws = draws + (case when draw then 1 else 0 end), updated_at = now()
  where id = c.player2_id;

  perform public._notify(c.player1_id, 'Match results',
    case when draw then 'It was a draw. Your entry fee was refunded.' when w = c.player1_id then 'You won! ' || s1 || ' to ' || s2 || '.' else 'You lost ' || s1 || ' to ' || s2 || '. Play again!' end,
    'match_result', jsonb_build_object('competition_id', c.id));
  perform public._notify(c.player2_id, 'Match results',
    case when draw then 'It was a draw. Your entry fee was refunded.' when w = c.player2_id then 'You won! ' || s2 || ' to ' || s1 || '.' else 'You lost ' || s2 || ' to ' || s1 || '. Play again!' end,
    'match_result', jsonb_build_object('competition_id', c.id));
  if w is not null then
    perform public._notify(w, 'Prize received', 'K' || trim(to_char(c.prize_zmw, 'FM999999990.00')) || ' has been added to your wallet.', 'prize',
      jsonb_build_object('competition_id', c.id));
  end if;
end;
$$;

-- Cancel an unaccepted request: refund who did not accept, re-queue who did
create or replace function public._expire_pending(p_comp uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.competitions;
begin
  select * into c from public.competitions where id = p_comp for update;
  if not found or c.status <> 'pending_accept' then return; end if;
  update public.competitions set status = 'cancelled', cancelled_reason = p_reason where id = c.id;

  if c.p1_accepted then perform public._enqueue(c.player1_id, c.entry_fee_zmw);
  else
    perform public._credit(c.player1_id, c.entry_fee_zmw, c.id, 'entry_refund');
    perform public._notify(c.player1_id, 'Match cancelled', 'The match was cancelled and your entry fee was refunded.', 'match_found', jsonb_build_object('competition_id', c.id));
  end if;
  if c.p2_accepted then perform public._enqueue(c.player2_id, c.entry_fee_zmw);
  else
    perform public._credit(c.player2_id, c.entry_fee_zmw, c.id, 'entry_refund');
    perform public._notify(c.player2_id, 'Match cancelled', 'The match was cancelled and your entry fee was refunded.', 'match_found', jsonb_build_object('competition_id', c.id));
  end if;
end;
$$;

-- Housekeeping: expired requests, ghost queue entries. Called often; also by pg_cron.
create or replace function public.sweep_matches()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  for r in select id from public.competitions where status = 'pending_accept' and accept_deadline < now() loop
    perform public._expire_pending(r.id, 'timeout');
  end loop;
  for r in select id from public.competitions where status = 'active' loop
    perform public._advance(r.id);
  end loop;
  for r in select user_id, fee_zmw from public.match_queue where last_seen < now() - interval '30 seconds' loop
    delete from public.match_queue where user_id = r.user_id;
    perform public._credit(r.user_id, r.fee_zmw, null, 'entry_refund');
    perform public._notify(r.user_id, 'Search ended', 'You left while searching, so your entry fee was refunded.', 'match_found', null);
  end loop;
  perform public._try_pair();
end;
$$;

drop function if exists public.find_match(uuid);

create or replace function public.find_match(p_uid uuid, p_category uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := public._entry_fee();
  v_need int := coalesce((public.setting('scoring')->>'question_count')::int, 10);
  v_n int;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  if (public.setting('maintenance')->>'enabled')::boolean is true then
    raise exception 'The app is under maintenance. Please try again later.'; end if;
  if exists (select 1 from public.competitions where status in ('pending_accept','active')
              and (player1_id = p_uid or player2_id = p_uid)) or exists (select 1 from public.match_queue where user_id = p_uid) then
    return public.match_state(p_uid);
  end if;

  if p_category is not null then
    if not exists (select 1 from public.categories where id = p_category and is_active) then
      raise exception 'This subject is not available.'; end if;
    select count(*) into v_n from public.questions where is_active and category_id = p_category;
  else
    select count(*) into v_n from public.questions where is_active;
  end if;
  if v_n < v_need then
    raise exception 'This subject does not have enough questions yet. Please choose another one.'; end if;

  perform public._debit(p_uid, v_fee, null, 'entry_fee');
  insert into public.match_queue (user_id, fee_zmw, category_id) values (p_uid, v_fee, p_category)
  on conflict (user_id) do update set last_seen = now();
  perform public._try_pair();
  perform public._nudge_category(p_category, p_uid);
  return public.match_state(p_uid);
end;
$$;

create or replace function public.cancel_search(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.match_queue; c public.competitions;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  delete from public.match_queue where user_id = p_uid returning * into q;
  if found then perform public._credit(p_uid, q.fee_zmw, null, 'entry_refund'); end if;
  select * into c from public.competitions where status = 'pending_accept' and (player1_id = p_uid or player2_id = p_uid) limit 1;
  if found then return public.respond_match(p_uid, c.id, false); end if;
  return jsonb_build_object('status', 'idle');
end;
$$;

create or replace function public.respond_match(p_uid uuid, p_comp uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.competitions; v_other uuid;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  select * into c from public.competitions where id = p_comp for update;
  if not found or p_uid not in (c.player1_id, c.player2_id) then raise exception 'Match not found'; end if;
  if c.status <> 'pending_accept' then return public.match_state(p_uid); end if;
  if c.accept_deadline < now() then perform public._expire_pending(c.id, 'timeout'); return public.match_state(p_uid); end if;

  if not p_accept then
    v_other := case when p_uid = c.player1_id then c.player2_id else c.player1_id end;
    update public.competitions set status = 'cancelled', cancelled_reason = 'declined' where id = c.id;
    perform public._credit(p_uid, c.entry_fee_zmw, c.id, 'entry_refund');
    perform public._notify(v_other, 'Opponent left', 'Your opponent declined. We are finding you a new one.', 'match_found', jsonb_build_object('competition_id', c.id));
    perform public._enqueue(v_other, c.entry_fee_zmw);
    return jsonb_build_object('status', 'idle');
  end if;

  if p_uid = c.player1_id then update public.competitions set p1_accepted = true where id = c.id;
  else update public.competitions set p2_accepted = true where id = c.id; end if;

  select * into c from public.competitions where id = p_comp;
  if c.p1_accepted and c.p2_accepted then
    update public.competitions set status = 'active', started_at = now(),
           current_index = 0, question_started_at = now() + interval '4 seconds'
     where id = c.id;
    perform public._notify(c.player1_id, 'Match starting', 'Both players are in. Get ready!', 'match_start', jsonb_build_object('competition_id', c.id));
    perform public._notify(c.player2_id, 'Match starting', 'Both players are in. Get ready!', 'match_start', jsonb_build_object('competition_id', c.id));
  end if;
  return public.match_state(p_uid);
end;
$$;

create or replace function public.submit_answer(p_uid uuid, p_comp uuid, p_index int, p_selected int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.competitions; v_q public.questions; v_ms int; v_ok boolean; v_pts int := 0;
  sc jsonb := public.setting('scoring'); v_pp int := coalesce((sc->>'points_per_correct')::int, 5);
  v_fastest boolean := coalesce((sc->>'fastest_takes_point')::boolean, true);
begin
  select * into c from public.competitions where id = p_comp for update;
  if not found or p_uid not in (c.player1_id, c.player2_id) then raise exception 'Match not found'; end if;
  if c.status <> 'active' then return public.match_state(p_uid); end if;
  if p_index <> c.current_index then return public.match_state(p_uid); end if;
  if now() < c.question_started_at then raise exception 'Question has not started yet'; end if;
  if now() > c.question_started_at + make_interval(secs => c.question_seconds) + interval '1 second' then
    perform public._advance(c.id); return public.match_state(p_uid); end if;
  if exists (select 1 from public.answers where competition_id = c.id and player_id = p_uid and question_index = p_index) then
    return public.match_state(p_uid); end if;
  if p_selected is null or p_selected < 0 or p_selected > 3 then raise exception 'Invalid answer'; end if;

  select * into v_q from public.questions where id = c.question_ids[p_index + 1];
  v_ok := (v_q.correct_index = p_selected);
  v_ms := least(c.question_seconds * 1000, greatest(0, (extract(epoch from (now() - c.question_started_at)) * 1000)::int));

  if v_ok then
    v_pts := v_pp;
    if v_fastest and exists (select 1 from public.answers where competition_id = c.id and question_index = p_index
                              and player_id <> p_uid and is_correct and points_earned > 0) then
      v_pts := 0;  -- opponent was faster on this question
    end if;
  end if;

  insert into public.answers (competition_id, player_id, question_id, selected_index, is_correct, time_taken_ms, points_earned, question_index)
  values (c.id, p_uid, v_q.id, p_selected, v_ok, v_ms, v_pts, p_index);

  perform public._advance(c.id);
  return public.match_state(p_uid) || jsonb_build_object('last_answer',
    jsonb_build_object('index', p_index, 'selected', p_selected, 'correct', v_ok, 'correct_index', v_q.correct_index, 'points', v_pts, 'time_ms', v_ms));
end;
$$;

-- Everything the app needs to render the current screen
create or replace function public.match_state(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.competitions; q public.match_queue; v_opp uuid; v_oppp public.profiles;
  v_total int; v_idx int; v_question public.questions; v_my public.answers; v_op public.answers;
  v_score_me int; v_score_op int; v_cat text;
  mm jsonb := public.setting('matchmaking');
  v_timeout int := coalesce((mm->>'timeout_s')::int, 90);
  v_widen int := coalesce((mm->>'widen_after_s')::int, 25);
begin
  select * into q from public.match_queue where user_id = p_uid;
  if found then
    perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
    update public.match_queue set last_seen = now() where user_id = p_uid;
    perform public._try_pair();
    select * into q from public.match_queue where user_id = p_uid;
    if found and q.created_at < now() - make_interval(secs => v_timeout) then
      delete from public.match_queue where user_id = p_uid;
      perform public._credit(p_uid, q.fee_zmw, null, 'entry_refund');
      return jsonb_build_object('status', 'timeout', 'refunded', q.fee_zmw, 'category_id', q.category_id,
        'category_name', (select name from public.categories where id = q.category_id),
        'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
  end if;

  select * into c from public.competitions
   where status in ('pending_accept','active') and (player1_id = p_uid or player2_id = p_uid)
   order by created_at desc limit 1;

  if found then
    if c.status = 'active' then
      perform public._advance(c.id);
      select * into c from public.competitions where id = c.id;
    elsif c.accept_deadline < now() then
      perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
      perform public._expire_pending(c.id, 'timeout');
      select * into c from public.competitions where id = c.id;
    end if;
  end if;

  if not found or c.status not in ('pending_accept','active') then
    select * into q from public.match_queue where user_id = p_uid;
    if found then
      return jsonb_build_object('status', 'searching', 'waited_s', extract(epoch from (now() - q.created_at))::int,
        'fee', q.fee_zmw, 'timeout_s', v_timeout, 'widen_s', v_widen,
        'category_id', q.category_id,
        'category_name', (select name from public.categories where id = q.category_id),
        'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    select * into c from public.competitions
     where status = 'completed' and (player1_id = p_uid or player2_id = p_uid)
       and completed_at > now() - interval '2 minutes' order by completed_at desc limit 1;
    if found then
      return jsonb_build_object('status', 'completed', 'competition_id', c.id, 'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    return jsonb_build_object('status', 'idle', 'server_time', (extract(epoch from now()) * 1000)::bigint);
  end if;

  v_opp := case when c.player1_id = p_uid then c.player2_id else c.player1_id end;
  select * into v_oppp from public.profiles where id = v_opp;
  select name into v_cat from public.categories where id = c.category_id;

  if c.status = 'pending_accept' then
    return jsonb_build_object(
      'status', 'pending_accept', 'competition_id', c.id, 'fee', c.entry_fee_zmw, 'prize', c.prize_zmw,
      'category_name', v_cat,
      'deadline', (extract(epoch from c.accept_deadline) * 1000)::bigint,
      'i_accepted', case when c.player1_id = p_uid then c.p1_accepted else c.p2_accepted end,
      'opponent', jsonb_build_object('name', public.mask_name(v_oppp.full_name), 'avatar_url', v_oppp.avatar_url),
      'server_time', (extract(epoch from now()) * 1000)::bigint);
  end if;

  v_total := coalesce(array_length(c.question_ids, 1), 0);
  v_idx := c.current_index;
  select * into v_question from public.questions where id = c.question_ids[v_idx + 1];
  select * into v_my from public.answers where competition_id = c.id and player_id = p_uid and question_index = v_idx;
  select * into v_op from public.answers where competition_id = c.id and player_id = v_opp and question_index = v_idx;
  select coalesce(sum(points_earned), 0) into v_score_me from public.answers where competition_id = c.id and player_id = p_uid;
  select coalesce(sum(points_earned), 0) into v_score_op from public.answers where competition_id = c.id and player_id = v_opp;

  return jsonb_build_object(
    'status', 'active', 'competition_id', c.id, 'server_time', (extract(epoch from now()) * 1000)::bigint,
    'category_name', v_cat,
    'index', v_idx, 'total', v_total,
    'question_started_at', (extract(epoch from c.question_started_at) * 1000)::bigint,
    'question_seconds', c.question_seconds,
    'question', jsonb_build_object('id', v_question.id, 'text', v_question.text, 'image_url', v_question.image_url, 'options', v_question.options),
    'me', jsonb_build_object('score', v_score_me, 'answered', v_my.id is not null, 'selected', v_my.selected_index,
                             'correct', v_my.is_correct, 'points', v_my.points_earned,
                             'correct_index', case when v_my.id is not null then v_question.correct_index end),
    'opponent', jsonb_build_object('name', public.mask_name(v_oppp.full_name), 'avatar_url', v_oppp.avatar_url,
                                   'score', v_score_op, 'answered', v_op.id is not null));
end;
$$;

create or replace function public.match_result(p_uid uuid, p_comp uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.competitions; p1 public.profiles; p2 public.profiles;
begin
  select * into c from public.competitions where id = p_comp;
  if not found or p_uid not in (c.player1_id, c.player2_id) then raise exception 'Match not found'; end if;
  if c.status <> 'completed' then raise exception 'Match is not finished'; end if;
  select * into p1 from public.profiles where id = c.player1_id;
  select * into p2 from public.profiles where id = c.player2_id;
  return jsonb_build_object(
    'competition_id', c.id, 'is_draw', c.is_draw, 'winner_id', c.winner_id, 'prize', c.prize_zmw, 'total_questions', array_length(c.question_ids, 1),
    'me', case when p_uid = c.player1_id
      then jsonb_build_object('id', p1.id, 'name', p1.full_name, 'avatar_url', p1.avatar_url, 'score', c.player1_score, 'correct', c.player1_correct, 'time_ms', c.player1_time_ms)
      else jsonb_build_object('id', p2.id, 'name', p2.full_name, 'avatar_url', p2.avatar_url, 'score', c.player2_score, 'correct', c.player2_correct, 'time_ms', c.player2_time_ms) end,
    'opponent', case when p_uid = c.player1_id
      then jsonb_build_object('id', p2.id, 'name', public.mask_name(p2.full_name), 'avatar_url', p2.avatar_url, 'score', c.player2_score, 'correct', c.player2_correct, 'time_ms', c.player2_time_ms)
      else jsonb_build_object('id', p1.id, 'name', public.mask_name(p1.full_name), 'avatar_url', p1.avatar_url, 'score', c.player1_score, 'correct', c.player1_correct, 'time_ms', c.player1_time_ms) end);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Public / player read functions (callable by signed-in users)
-- ---------------------------------------------------------------------------
create or replace function public.get_categories(p_all boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  with need as (
    select coalesce((public.setting('scoring')->>'question_count')::int, 10) as n
  ),
  qn as (
    select category_id, count(*)::int as n from public.questions
     where is_active and category_id is not null group by category_id
  ),
  pl as (
    select category_id, count(distinct pid)::int as n from (
      select category_id, player1_id as pid from public.competitions where status = 'completed' and category_id is not null
      union all
      select category_id, player2_id from public.competitions where status = 'completed' and category_id is not null
    ) x group by category_id
  ),
  wt as (
    select category_id, count(*)::int as n from public.match_queue
     where last_seen > now() - interval '15 seconds' and category_id is not null group by category_id
  ),
  mine as (
    select category_id, max(created_at) as last_played from public.competitions
     where category_id is not null and auth.uid() in (player1_id, player2_id) group by category_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'description', c.description, 'icon', c.icon, 'image_url', c.image_url,
    'accent', c.accent, 'sort_order', c.sort_order, 'is_active', c.is_active,
    'questions', coalesce(qn.n, 0), 'questions_needed', need.n,
    'playable', coalesce(qn.n, 0) >= need.n,
    'played', coalesce(pl.n, 0), 'waiting', coalesce(wt.n, 0),
    'my_last_played', mine.last_played
  ) order by c.sort_order, c.name), '[]'::jsonb)
  from public.categories c
  cross join need
  left join qn on qn.category_id = c.id
  left join pl on pl.category_id = c.id
  left join wt on wt.category_id = c.id
  left join mine on mine.category_id = c.id
  where c.is_active or (p_all and public.is_admin());
$$;

create or replace function public.get_leaderboard(p_limit int default 10)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(t order by t.rank) from (
        select row_number() over (order by total_score desc, wins desc, created_at) as rank,
               id as user_id, public.mask_name(full_name) as name, avatar_url,
               games_played, wins, total_score as points
          from public.profiles
         where games_played > 0
         order by total_score desc, wins desc, created_at
         limit least(greatest(p_limit, 1), 50)) t), '[]'::jsonb),
    'winners', coalesce((
      select jsonb_agg(w) from (
        select public.mask_name(p.full_name) as name, p.avatar_url, c.prize_zmw as prize, c.completed_at
          from public.competitions c join public.profiles p on p.id = c.winner_id
         where c.status = 'completed' and c.winner_id is not null
         order by c.completed_at desc limit 10) w), '[]'::jsonb),
    'updated_at', now());
$$;

create or replace function public.get_wallet_history(p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
    select id, type, case when type = 'withdraw' then -amount_zmw else amount_zmw end as amount,
           status, created_at, phone as detail
      from public.payment_transactions where user_id = auth.uid()
    union all
    select id, type, amount_zmw, status, created_at, null
      from public.reward_transactions where user_id = auth.uid()
    order by created_at desc limit least(greatest(p_limit, 1), 100)) x;
$$;

-- ---------------------------------------------------------------------------
-- 7. Admin functions
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'questions', (select count(*) from public.questions where is_active),
    'matches_completed', (select count(*) from public.competitions where status = 'completed'),
    'matches_live', (select count(*) from public.competitions where status in ('pending_accept','active')),
    'deposits_total', coalesce((select sum(amount_zmw) from public.payment_transactions where type = 'deposit' and status = 'completed'), 0),
    'withdrawals_total', coalesce((select sum(amount_zmw) from public.payment_transactions where type = 'withdraw' and status = 'completed'), 0),
    'withdrawals_pending', (select count(*) from public.payment_transactions where type = 'withdraw' and status = 'pending'),
    'platform_revenue', coalesce((select sum(platform_fee_zmw) from public.competitions where status = 'completed' and not is_draw), 0),
    'wallet_balances', coalesce((select sum(balance_zmw) from public.profiles), 0));
end;
$$;

create or replace function public.admin_list_transactions(p_type text default null, p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((select jsonb_agg(x) from (
    select t.id, t.type, t.amount_zmw, t.status, t.phone, t.reference_id, t.failure_reason, t.created_at, p.full_name
      from public.payment_transactions t left join public.profiles p on p.id = t.user_id
     where p_type is null or t.type = p_type
     order by t.created_at desc limit least(p_limit, 300)) x), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_matches(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((select jsonb_agg(x) from (
    select c.id, c.status, c.player1_score, c.player2_score, c.prize_zmw, c.is_draw, c.created_at,
           p1.full_name as player1, p2.full_name as player2, w.full_name as winner
      from public.competitions c
      left join public.profiles p1 on p1.id = c.player1_id
      left join public.profiles p2 on p2.id = c.player2_id
      left join public.profiles w on w.id = c.winner_id
     order by c.created_at desc limit least(p_limit, 300)) x), '[]'::jsonb);
end;
$$;

create or replace function public.admin_send_announcement(p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  insert into public.notifications (user_id, title, body, type) values (null, p_title, p_body, 'system');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.quizzes enable row level security;
alter table public.competitions enable row level security;
alter table public.answers enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;
alter table public.match_queue enable row level security;

-- wipe every old policy so nothing permissive survives from earlier versions
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy categories_read on public.categories for select using (true);
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy banners_read on public.banners for select using (true);
create policy banners_admin on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy rewards_read on public.rewards for select using (true);
create policy rewards_admin on public.rewards for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.app_settings for select using (true);
create policy settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- Questions + quizzes: admin only. Players get questions through the match flow.
create policy questions_admin on public.questions for all using (public.is_admin()) with check (public.is_admin());
create policy quizzes_admin on public.quizzes for all using (public.is_admin()) with check (public.is_admin());

-- Read-only for participants. No client writes at all.
create policy competitions_read on public.competitions for select
  using (player1_id = auth.uid() or player2_id = auth.uid() or public.is_admin());
create policy answers_read on public.answers for select using (player_id = auth.uid() or public.is_admin());
create policy reward_tx_read on public.reward_transactions for select using (user_id = auth.uid() or public.is_admin());
create policy payment_tx_read on public.payment_transactions for select using (user_id = auth.uid() or public.is_admin());

create policy notif_read on public.notifications for select using (user_id = auth.uid() or user_id is null or public.is_admin());
create policy notif_update_own on public.notifications for update using (user_id = auth.uid());

-- Column-level locks: players may only edit harmless profile fields
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, push_token, push_enabled) on public.profiles to authenticated;
revoke insert, update, delete on public.competitions, public.answers, public.reward_transactions,
  public.payment_transactions, public.match_queue from anon, authenticated;
revoke all on public.match_queue from anon, authenticated;
revoke insert, delete on public.notifications from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Function permissions
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  -- engine functions: Edge Functions (service_role) only
  foreach f in array array[
    '_notify(uuid,text,text,text,jsonb)', '_debit(uuid,numeric,uuid,text)', '_credit(uuid,numeric,uuid,text)',
    'begin_deposit(uuid,numeric,text,text)', 'begin_withdrawal(uuid,numeric,text,text)',
    'settle_payment(text,text,jsonb,text)', '_entry_fee()', '_enqueue(uuid,numeric)', '_try_pair()',
    '_advance(uuid)', '_finalize(uuid)', '_expire_pending(uuid,text)', 'sweep_matches()',
    'find_match(uuid,uuid)', '_nudge_category(uuid,uuid)', 'cancel_search(uuid)', 'respond_match(uuid,uuid,boolean)',
    'submit_answer(uuid,uuid,int,int)', 'match_state(uuid)', 'match_result(uuid,uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  -- is_admin() and setting() stay callable by everyone: RLS policies use them
  -- player / admin RPCs (admin ones check is_admin() inside)
  foreach f in array array[
    'get_leaderboard(int)', 'get_categories(boolean)', 'get_wallet_history(int)', 'admin_stats()', 'admin_list_transactions(text,int)',
    'admin_list_matches(int)', 'admin_send_announcement(text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Realtime (instant match updates + notifications) and storage buckets
-- ---------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.competitions; exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
end $$;

insert into storage.buckets (id, name, public) values
  ('banners', 'banners', true), ('rewards', 'rewards', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select
  using (bucket_id in ('banners', 'rewards', 'avatars'));
drop policy if exists "admin write media" on storage.objects;
create policy "admin write media" on storage.objects for all
  using (bucket_id in ('banners', 'rewards') and public.is_admin())
  with check (bucket_id in ('banners', 'rewards') and public.is_admin());
drop policy if exists "users write own avatar" on storage.objects;
create policy "users write own avatar" on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid() is not null)
  with check (bucket_id = 'avatars' and auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- 11. Background sweeper (optional but recommended)
--     Enable first: Dashboard → Database → Extensions → pg_cron
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'brainspeed-sweep';
    perform cron.schedule('brainspeed-sweep', '* * * * *', 'select public.sweep_matches()');
  end if;
exception when others then
  raise notice 'pg_cron not configured: %', sqlerrm;
end $$;

-- Make yourself admin (replace the email), run once:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- ============ v4: online presence and player invitations ============
-- v4 upgrade 1/7: who is online, and invitations
alter table public.profiles add column if not exists appear_online boolean not null default true;
grant update (appear_online) on public.profiles to authenticated;

create table if not exists public.presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen timestamptz not null default now(),
  category_id uuid references public.categories (id) on delete set null
);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

create table if not exists public.match_invites (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  fee_zmw numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  from_seen boolean not null default false,
  competition_id uuid references public.competitions (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists match_invites_from_idx on public.match_invites (from_user, status);
create index if not exists match_invites_to_idx on public.match_invites (to_user, status);
alter table public.match_invites enable row level security;
drop policy if exists invites_read on public.match_invites;
create policy invites_read on public.match_invites for select
  using (from_user = auth.uid() or to_user = auth.uid() or public.is_admin());
revoke insert, update, delete on public.match_invites from anon, authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.match_invites; exception when others then null; end;
end $$;

update public.app_settings set value = value || '{"invite_ttl_s": 60}'
 where key = 'matchmaking' and not (value ? 'invite_ttl_s');

-- v4 upgrade 2/7: helpers and sending an invitation (the sender's entry fee is held)
create or replace function public._busy(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.match_queue where user_id = p_uid)
      or exists (select 1 from public.competitions
                  where status in ('pending_accept', 'active') and p_uid in (player1_id, player2_id))
      or exists (select 1 from public.match_invites
                  where from_user = p_uid and status = 'pending' and expires_at > now());
$$;

create or replace function public._end_invite(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare i public.match_invites;
begin
  select * into i from public.match_invites where id = p_id for update;
  if not found or i.status <> 'pending' then return; end if;
  update public.match_invites set status = p_status, from_seen = (p_status = 'cancelled') where id = i.id;
  perform public._credit(i.from_user, i.fee_zmw, null, 'entry_refund');
end;
$$;

create or replace function public._expire_stale_invites()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from public.match_invites where status = 'pending' and expires_at < now() loop
    perform public._end_invite(r.id, 'expired');
  end loop;
end;
$$;

create or replace function public.send_invite(p_uid uuid, p_to uuid, p_category uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := public._entry_fee();
  v_need int := coalesce((public.setting('scoring')->>'question_count')::int, 10);
  v_ttl int := coalesce((public.setting('matchmaking')->>'invite_ttl_s')::int, 60);
  v_prize numeric := coalesce((public.setting('platform_fees')->>'competition_fee_zmw')::numeric, 20) * 2;
  v_n int; v_inv uuid; v_name text; v_cat text;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  if (public.setting('maintenance')->>'enabled')::boolean is true then
    raise exception 'The app is under maintenance. Please try again later.'; end if;
  perform public._expire_stale_invites();

  if p_to is null or p_to = p_uid then raise exception 'Choose another player to invite.'; end if;
  if p_category is null or not exists (select 1 from public.categories where id = p_category and is_active) then
    raise exception 'Choose a subject to play.'; end if;
  select count(*) into v_n from public.questions where is_active and category_id = p_category;
  if v_n < v_need then raise exception 'This subject does not have enough questions yet.'; end if;

  if public._busy(p_uid) then raise exception 'Finish or cancel your current search or match first.'; end if;
  if not exists (select 1 from public.presence pr join public.profiles p on p.id = pr.user_id
                  where pr.user_id = p_to and pr.last_seen > now() - interval '45 seconds' and p.appear_online) then
    raise exception 'That player is no longer online.'; end if;
  if public._busy(p_to) then raise exception 'That player is in a match right now.'; end if;
  if exists (select 1 from public.match_invites
              where from_user = p_uid and to_user = p_to and created_at > now() - interval '2 minutes') then
    raise exception 'You just invited this player. Please wait a little before inviting again.'; end if;
  if (select count(*) from public.match_invites
       where from_user = p_uid and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'Too many invitations. Please try again in a few minutes.'; end if;

  perform public._debit(p_uid, v_fee, null, 'entry_fee');
  insert into public.match_invites (from_user, to_user, category_id, fee_zmw, expires_at)
  values (p_uid, p_to, p_category, v_fee, now() + make_interval(secs => v_ttl)) returning id into v_inv;

  select public.mask_name(full_name) into v_name from public.profiles where id = p_uid;
  select name into v_cat from public.categories where id = p_category;
  perform public._notify(p_to, v_name || ' invited you to play',
    v_cat || ' · entry K' || trim(to_char(v_fee, 'FM999999990.00')) || ' · winner takes K' || trim(to_char(v_prize, 'FM999999990.00')),
    'invite', jsonb_build_object('invite_id', v_inv, 'category_id', p_category));
  return public.match_state(p_uid);
end;
$$;

-- v4 upgrade 3/7: accept, decline and cancel an invitation
create or replace function public.respond_invite(p_uid uuid, p_invite uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  i public.match_invites;
  fees jsonb := public.setting('platform_fees'); sc jsonb := public.setting('scoring');
  v_count int := coalesce((sc->>'question_count')::int, 10);
  v_secs int := coalesce((sc->>'question_seconds')::int, 30);
  v_cfee numeric := coalesce((fees->>'competition_fee_zmw')::numeric, 20);
  v_pfee numeric := coalesce((fees->>'platform_fee_zmw')::numeric, 3);
  v_ids uuid[]; v_comp uuid; v_name text;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  perform public._expire_stale_invites();
  select * into i from public.match_invites where id = p_invite for update;
  if not found or i.to_user <> p_uid then raise exception 'Invitation not found.'; end if;
  if i.status in ('expired', 'cancelled') then raise exception 'This invitation is no longer available.'; end if;
  if i.status <> 'pending' then return public.match_state(p_uid); end if;

  select public.mask_name(full_name) into v_name from public.profiles where id = p_uid;

  if not p_accept then
    perform public._end_invite(i.id, 'declined');
    perform public._notify(i.from_user, 'Invitation declined',
      v_name || ' declined your invitation. Your entry fee was refunded.', 'invite_result',
      jsonb_build_object('invite_id', i.id));
    return jsonb_build_object('status', 'idle');
  end if;

  if public._busy(p_uid) then raise exception 'Finish your current match or search first.'; end if;
  if exists (select 1 from public.competitions
              where status in ('pending_accept', 'active') and i.from_user in (player1_id, player2_id)) then
    raise exception 'That player is already in a match.'; end if;

  select array_agg(id) into v_ids from (
    select id from public.questions where is_active and category_id = i.category_id order by random() limit v_count) q;
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'This subject does not have enough questions yet.'; end if;

  perform public._debit(p_uid, i.fee_zmw, null, 'entry_fee');

  insert into public.competitions (
    player1_id, player2_id, status, entry_fee_zmw, competition_fee_zmw, platform_fee_zmw, prize_zmw,
    question_ids, question_seconds, category_id,
    p1_accepted, p2_accepted, started_at, current_index, question_started_at
  ) values (
    i.from_user, p_uid, 'active', i.fee_zmw, v_cfee, v_pfee * 2, v_cfee * 2,
    v_ids, v_secs, i.category_id,
    true, true, now(), 0, now() + interval '4 seconds'
  ) returning id into v_comp;

  update public.match_invites set status = 'accepted', competition_id = v_comp, from_seen = true where id = i.id;
  perform public._notify(i.from_user, 'Match starting', v_name || ' accepted. Get ready!', 'match_start',
    jsonb_build_object('competition_id', v_comp));
  return public.match_state(p_uid);
end;
$$;

create or replace function public.cancel_invite(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  select id into v_id from public.match_invites
   where from_user = p_uid and status = 'pending' order by created_at desc limit 1;
  if found then perform public._end_invite(v_id, 'cancelled'); end if;
  return jsonb_build_object('status', 'idle');
end;
$$;

-- v4 upgrade 4/7: searching is blocked while an invitation is out; the sweeper also expires invitations
create or replace function public.find_match(p_uid uuid, p_category uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := public._entry_fee();
  v_need int := coalesce((public.setting('scoring')->>'question_count')::int, 10);
  v_n int;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  if (public.setting('maintenance')->>'enabled')::boolean is true then
    raise exception 'The app is under maintenance. Please try again later.'; end if;
  perform public._expire_stale_invites();
  if public._busy(p_uid) then
    return public.match_state(p_uid);
  end if;

  if p_category is not null then
    if not exists (select 1 from public.categories where id = p_category and is_active) then
      raise exception 'This subject is not available.'; end if;
    select count(*) into v_n from public.questions where is_active and category_id = p_category;
  else
    select count(*) into v_n from public.questions where is_active;
  end if;
  if v_n < v_need then
    raise exception 'This subject does not have enough questions yet. Please choose another one.'; end if;

  perform public._debit(p_uid, v_fee, null, 'entry_fee');
  insert into public.match_queue (user_id, fee_zmw, category_id) values (p_uid, v_fee, p_category)
  on conflict (user_id) do update set last_seen = now();
  perform public._try_pair();
  perform public._nudge_category(p_category, p_uid);
  return public.match_state(p_uid);
end;
$$;

create or replace function public.sweep_matches()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
  for r in select id from public.competitions where status = 'pending_accept' and accept_deadline < now() loop
    perform public._expire_pending(r.id, 'timeout');
  end loop;
  for r in select id from public.competitions where status = 'active' loop
    perform public._advance(r.id);
  end loop;
  for r in select user_id, fee_zmw from public.match_queue where last_seen < now() - interval '30 seconds' loop
    delete from public.match_queue where user_id = r.user_id;
    perform public._credit(r.user_id, r.fee_zmw, null, 'entry_refund');
    perform public._notify(r.user_id, 'Search ended', 'You left while searching, so your entry fee was refunded.', 'match_found', null);
  end loop;
  perform public._expire_stale_invites();
  perform public._try_pair();
end;
$$;

-- v4 upgrade 5/7: match_state also reports an outgoing invitation (waiting, declined, expired)
create or replace function public.match_state(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.competitions; q public.match_queue; v_opp uuid; v_oppp public.profiles;
  v_total int; v_idx int; v_question public.questions; v_my public.answers; v_op public.answers;
  v_score_me int; v_score_op int; v_cat text; inv public.match_invites;
  mm jsonb := public.setting('matchmaking');
  v_timeout int := coalesce((mm->>'timeout_s')::int, 90);
  v_widen int := coalesce((mm->>'widen_after_s')::int, 25);
begin
  perform public._expire_stale_invites();
  select * into q from public.match_queue where user_id = p_uid;
  if found then
    perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
    update public.match_queue set last_seen = now() where user_id = p_uid;
    perform public._try_pair();
    select * into q from public.match_queue where user_id = p_uid;
    if found and q.created_at < now() - make_interval(secs => v_timeout) then
      delete from public.match_queue where user_id = p_uid;
      perform public._credit(p_uid, q.fee_zmw, null, 'entry_refund');
      return jsonb_build_object('status', 'timeout', 'refunded', q.fee_zmw, 'category_id', q.category_id,
        'category_name', (select name from public.categories where id = q.category_id),
        'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
  end if;

  select * into c from public.competitions
   where status in ('pending_accept','active') and (player1_id = p_uid or player2_id = p_uid)
   order by created_at desc limit 1;

  if found then
    if c.status = 'active' then
      perform public._advance(c.id);
      select * into c from public.competitions where id = c.id;
    elsif c.accept_deadline < now() then
      perform pg_advisory_xact_lock(hashtext('brainspeed_matchmaking'));
      perform public._expire_pending(c.id, 'timeout');
      select * into c from public.competitions where id = c.id;
    end if;
  end if;

  if not found or c.status not in ('pending_accept','active') then
    select * into q from public.match_queue where user_id = p_uid;
    if found then
      return jsonb_build_object('status', 'searching', 'waited_s', extract(epoch from (now() - q.created_at))::int,
        'fee', q.fee_zmw, 'timeout_s', v_timeout, 'widen_s', v_widen,
        'category_id', q.category_id,
        'category_name', (select name from public.categories where id = q.category_id),
        'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    select * into inv from public.match_invites where from_user = p_uid and status = 'pending' order by created_at desc limit 1;
    if found then
      return jsonb_build_object('status', 'invite_sent',
        'invite', jsonb_build_object('id', inv.id,
          'to_name', (select public.mask_name(full_name) from public.profiles where id = inv.to_user),
          'to_avatar', (select avatar_url from public.profiles where id = inv.to_user),
          'seconds_left', greatest(0, extract(epoch from (inv.expires_at - now()))::int)),
        'category_id', inv.category_id,
        'category_name', (select name from public.categories where id = inv.category_id),
        'fee', inv.fee_zmw, 'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    select * into inv from public.match_invites
     where from_user = p_uid and status in ('declined', 'expired') and not from_seen order by created_at desc limit 1;
    if found then
      update public.match_invites set from_seen = true where id = inv.id;
      return jsonb_build_object('status', 'invite_ended', 'reason', inv.status, 'refunded', inv.fee_zmw,
        'to_name', (select public.mask_name(full_name) from public.profiles where id = inv.to_user),
        'category_id', inv.category_id,
        'category_name', (select name from public.categories where id = inv.category_id),
        'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    select * into c from public.competitions
     where status = 'completed' and (player1_id = p_uid or player2_id = p_uid)
       and completed_at > now() - interval '2 minutes' order by completed_at desc limit 1;
    if found then
      return jsonb_build_object('status', 'completed', 'competition_id', c.id, 'server_time', (extract(epoch from now()) * 1000)::bigint);
    end if;
    return jsonb_build_object('status', 'idle', 'server_time', (extract(epoch from now()) * 1000)::bigint);
  end if;

  v_opp := case when c.player1_id = p_uid then c.player2_id else c.player1_id end;
  select * into v_oppp from public.profiles where id = v_opp;
  select name into v_cat from public.categories where id = c.category_id;

  if c.status = 'pending_accept' then
    return jsonb_build_object(
      'status', 'pending_accept', 'competition_id', c.id, 'fee', c.entry_fee_zmw, 'prize', c.prize_zmw,
      'category_name', v_cat,
      'deadline', (extract(epoch from c.accept_deadline) * 1000)::bigint,
      'i_accepted', case when c.player1_id = p_uid then c.p1_accepted else c.p2_accepted end,
      'opponent', jsonb_build_object('name', public.mask_name(v_oppp.full_name), 'avatar_url', v_oppp.avatar_url),
      'server_time', (extract(epoch from now()) * 1000)::bigint);
  end if;

  v_total := coalesce(array_length(c.question_ids, 1), 0);
  v_idx := c.current_index;
  select * into v_question from public.questions where id = c.question_ids[v_idx + 1];
  select * into v_my from public.answers where competition_id = c.id and player_id = p_uid and question_index = v_idx;
  select * into v_op from public.answers where competition_id = c.id and player_id = v_opp and question_index = v_idx;
  select coalesce(sum(points_earned), 0) into v_score_me from public.answers where competition_id = c.id and player_id = p_uid;
  select coalesce(sum(points_earned), 0) into v_score_op from public.answers where competition_id = c.id and player_id = v_opp;

  return jsonb_build_object(
    'status', 'active', 'competition_id', c.id, 'server_time', (extract(epoch from now()) * 1000)::bigint,
    'category_name', v_cat,
    'index', v_idx, 'total', v_total,
    'question_started_at', (extract(epoch from c.question_started_at) * 1000)::bigint,
    'question_seconds', c.question_seconds,
    'question', jsonb_build_object('id', v_question.id, 'text', v_question.text, 'image_url', v_question.image_url, 'options', v_question.options),
    'me', jsonb_build_object('score', v_score_me, 'answered', v_my.id is not null, 'selected', v_my.selected_index,
                             'correct', v_my.is_correct, 'points', v_my.points_earned,
                             'correct_index', case when v_my.id is not null then v_question.correct_index end),
    'opponent', jsonb_build_object('name', public.mask_name(v_oppp.full_name), 'avatar_url', v_oppp.avatar_url,
                                   'score', v_score_op, 'answered', v_op.id is not null));
end;
$$;

-- v4 upgrade 6/7: heartbeat, the online list, and my incoming invitations
create or replace function public.ping_presence(p_category uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.presence (user_id, last_seen, category_id)
  select auth.uid(), now(), p_category where auth.uid() is not null
  on conflict (user_id) do update set last_seen = now(), category_id = excluded.category_id;
$$;

create or replace function public.online_players(p_category uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.here desc, x.plays_subject desc, x.last_seen desc), '[]'::jsonb) from (
    select p.id as user_id, public.mask_name(p.full_name) as name, p.avatar_url, p.games_played, p.wins,
           (p_category is not null and pr.category_id is not distinct from p_category) as here,
           exists (select 1 from public.competitions c
                    where c.category_id = p_category and c.status = 'completed'
                      and p.id in (c.player1_id, c.player2_id)) as plays_subject,
           public._busy(p.id) as busy, pr.last_seen
      from public.presence pr join public.profiles p on p.id = pr.user_id
     where pr.last_seen > now() - interval '45 seconds' and p.appear_online and p.id <> auth.uid()
     order by (p_category is not null and pr.category_id is not distinct from p_category) desc, pr.last_seen desc
     limit 40) x;
$$;

create or replace function public.my_invites()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'from_name', public.mask_name(p.full_name), 'from_avatar', p.avatar_url,
    'category_id', i.category_id, 'category_name', c.name, 'fee', i.fee_zmw,
    'prize', coalesce((public.setting('platform_fees')->>'competition_fee_zmw')::numeric, 20) * 2,
    'seconds_left', greatest(0, extract(epoch from (i.expires_at - now()))::int)
  ) order by i.created_at desc), '[]'::jsonb)
  from public.match_invites i
  join public.profiles p on p.id = i.from_user
  left join public.categories c on c.id = i.category_id
  where i.to_user = auth.uid() and i.status = 'pending' and i.expires_at > now()
    and not public._busy(auth.uid());
$$;

-- v4 upgrade 7/7: permissions (money-moving functions stay server-only)
do $$
declare f text;
begin
  foreach f in array array[
    '_busy(uuid)', '_end_invite(uuid,text)', '_expire_stale_invites()',
    'send_invite(uuid,uuid,uuid)', 'respond_invite(uuid,uuid,boolean)', 'cancel_invite(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['ping_presence(uuid)', 'online_players(uuid)', 'my_invites()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

