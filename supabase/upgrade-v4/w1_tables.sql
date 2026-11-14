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
