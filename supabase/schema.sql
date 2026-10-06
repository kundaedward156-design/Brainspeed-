-- Brainspeed full schema (UUID everywhere)
-- Run in Supabase SQL Editor once

create extension if not exists "pgcrypto";

-- Profiles (id = auth.users.id)
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
  balance_zmw numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  text text not null,
  image_url text,
  options jsonb not null default '[]',
  correct_index int not null default 0,
  difficulty text not null default 'medium',
  time_limit_sec int not null default 15,
  points int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid references public.categories (id) on delete set null,
  question_ids uuid[] not null default '{}',
  question_count int not null default 0,
  entry_fee_zmw numeric(12,2) not null default 22,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes (id),
  player1_id uuid references public.profiles (id),
  player2_id uuid references public.profiles (id),
  status text not null default 'waiting',
  player1_score int not null default 0,
  player2_score int not null default 0,
  winner_id uuid references public.profiles (id),
  entry_fee_zmw numeric(12,2) not null default 22,
  platform_fee_zmw numeric(12,2) not null default 4,
  prize_zmw numeric(12,2) not null default 40,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  amount_zmw numeric(12,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  competition_rules text default '',
  scoring_config jsonb default '{}',
  reward_config jsonb default '{}',
  maintenance_mode boolean not null default false,
  min_entry_fee_zmw numeric(12,2) default 10,
  max_entry_fee_zmw numeric(12,2) default 100
);

-- RLS helpers
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.quizzes enable row level security;
alter table public.competitions enable row level security;
alter table public.answers enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert
  with check (id = auth.uid());

-- Public read for game content
create policy "categories_read" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for all using (public.is_admin());

create policy "questions_read" on public.questions for select using (true);
create policy "questions_admin_write" on public.questions for all using (public.is_admin());

create policy "quizzes_read" on public.quizzes for select using (true);
create policy "quizzes_admin_write" on public.quizzes for all using (public.is_admin());

create policy "banners_read" on public.banners for select using (true);
create policy "banners_admin_write" on public.banners for all using (public.is_admin());

create policy "rewards_read" on public.rewards for select using (true);
create policy "rewards_admin_write" on public.rewards for all using (public.is_admin());

create policy "competitions_participants" on public.competitions for select
  using (player1_id = auth.uid() or player2_id = auth.uid() or public.is_admin());
create policy "competitions_insert" on public.competitions for insert
  with check (player1_id = auth.uid());
create policy "competitions_update_participants" on public.competitions for update
  using (player1_id = auth.uid() or player2_id = auth.uid() or public.is_admin());

create policy "answers_own" on public.answers for select
  using (player_id = auth.uid() or public.is_admin());
create policy "answers_insert_own" on public.answers for insert
  with check (player_id = auth.uid());

create policy "tx_own" on public.reward_transactions for select
  using (user_id = auth.uid() or public.is_admin());

create policy "notif_own" on public.notifications for select
  using (user_id = auth.uid() or user_id is null or public.is_admin());
create policy "notif_update_own" on public.notifications for update
  using (user_id = auth.uid());

create policy "settings_read" on public.app_settings for select using (true);
create policy "settings_admin" on public.app_settings for all using (public.is_admin());

-- Storage buckets (run in dashboard or via API): banners, rewards — public read
