-- UMTUBA: 14-day hide after a 5-second consecutive watch.
-- PRINT / write only. Do not apply from the app. Never supabase db push.
-- Owner applies this by hand in the Supabase SQL Editor after reviewing it.
--
-- Separate from post_views / record_post_view. Do not change the public view
-- counter. Rewards/recommendation watch_signals stay untouched.

begin;

create table if not exists public.post_watch_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists post_watch_completions_user_watched_at_idx
  on public.post_watch_completions (user_id, watched_at desc);

create index if not exists post_watch_completions_user_watched_at_post_idx
  on public.post_watch_completions (user_id, watched_at asc, post_id);

create index if not exists post_watch_completions_post_id_idx
  on public.post_watch_completions (post_id);

alter table public.post_watch_completions enable row level security;

drop policy if exists "Users can read own watch completions" on public.post_watch_completions;
create policy "Users can read own watch completions"
  on public.post_watch_completions
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.post_watch_completions from public, anon;
grant select on table public.post_watch_completions to authenticated;

create or replace function public.record_post_watch_completion(p_post_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_post_id is null or p_post_id <= 0 then
    raise exception 'Invalid post';
  end if;

  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  insert into public.post_watch_completions (user_id, post_id, watched_at)
  values (v_uid, p_post_id, now())
  on conflict (user_id, post_id)
  do update set watched_at = excluded.watched_at;

  return jsonb_build_object('ok', true, 'postId', p_post_id);
end;
$$;

revoke all on function public.record_post_watch_completion(bigint) from public, anon;
grant execute on function public.record_post_watch_completion(bigint) to authenticated;

comment on table public.post_watch_completions is
  'Qualified 5s consecutive watches used to hide a video from Home/Watch for 14 days. Not the public view counter.';

comment on function public.record_post_watch_completion(bigint) is
  'Upsert the caller''s qualified watch. Does not increment posts.views.';

commit;
