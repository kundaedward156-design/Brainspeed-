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
