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
