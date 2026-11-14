-- v3 upgrade 1/6: subjects (categories) get a look, matches/queue know their subject
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists accent text;
alter table public.categories add column if not exists last_nudge_at timestamptz;

alter table public.competitions add column if not exists category_id uuid references public.categories (id) on delete set null;
alter table public.match_queue add column if not exists category_id uuid references public.categories (id) on delete set null;
create index if not exists competitions_cat_idx on public.competitions (category_id, status);
create index if not exists questions_cat_idx on public.questions (category_id) where is_active;

insert into public.app_settings (key, value) values
  ('matchmaking', '{"widen_after_s": 25, "timeout_s": 90, "nudges": true, "nudge_cooldown_min": 10}')
on conflict (key) do nothing;

-- every match is 10 questions
update public.app_settings
   set value = jsonb_set(value, '{question_count}', '10')
 where key = 'scoring';
