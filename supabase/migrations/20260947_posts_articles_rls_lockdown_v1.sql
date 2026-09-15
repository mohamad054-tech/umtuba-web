-- ALREADY APPLIED MANUALLY TO PRODUCTION 2026-09-15. Recorded for history. Do not re-apply blindly.

begin;
drop policy if exists "Anyone can create posts" on public.posts;
drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Anyone can read posts" on public.posts;
drop policy if exists "Posts are viewable when public or owned" on public.posts;
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts visible if public or owned"
  on public.posts for select to anon, authenticated
  using (
    deleted_at is null
    and (visibility = 'public' or (select auth.uid()) = user_id)
  );
revoke insert, update, delete on table public.posts from anon;
create or replace function public.guard_post_owner_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed text[] := array[
    'content','media_status','processing_started_at','processing_progress',
    'processing_completed_at','processing_error','thumbnail_path'
  ];
begin
  if current_user in ('authenticated', 'anon')
     and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    raise exception 'post_column_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_post_owner_columns_trg on public.posts;
create trigger guard_post_owner_columns_trg
before update on public.posts
for each row execute function public.guard_post_owner_columns();
drop policy if exists "Owners insert own articles" on public.articles;
drop policy if exists "Owners update own articles" on public.articles;
drop policy if exists "Owners delete own articles" on public.articles;
revoke insert, update, delete on table public.articles from anon, authenticated;
commit;
