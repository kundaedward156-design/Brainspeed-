-- v3 upgrade 3/6: find_match takes a subject; sweeper tells ghost searchers they were refunded
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
