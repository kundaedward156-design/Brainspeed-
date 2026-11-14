-- v3 upgrade 5/6: subjects list with player counts, waiting players and the caller's recent plays
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
