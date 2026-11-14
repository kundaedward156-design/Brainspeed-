-- v3 upgrade 4/6: match_state keeps the search alive, pairs, widens and times out with a refund
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
