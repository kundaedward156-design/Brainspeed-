-- v3 upgrade 2/6: pairing inside the same subject, widening to any subject after a wait
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

-- When a player starts waiting in a subject, tell recent players of that subject (rate limited)
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
