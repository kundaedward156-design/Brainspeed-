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
