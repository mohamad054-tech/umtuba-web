-- APPLIED TO PRODUCTION 2026-09-16
-- UMTUBA owner caption edit V1
-- Narrow RPC: authenticated owner may update public.posts.content only.
-- Existing RLS "Users can update their own posts" already allows owner UPDATE
-- of any column; this RPC is the caption-only contract the app prefers.

create or replace function public.update_own_post_caption(
  p_post_id bigint,
  p_content text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
  v_updated text;
begin
  if v_user is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if char_length(v_content) > 1000 then
    raise exception 'caption_too_long' using errcode = '22023';
  end if;

  update public.posts
  set content = v_content
  where id = p_post_id
    and user_id = v_user
    and deleted_at is null
  returning content into v_updated;

  if v_updated is null then
    raise exception 'not_found_or_forbidden' using errcode = '42501';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.update_own_post_caption(bigint, text) from public, anon;
grant execute on function public.update_own_post_caption(bigint, text) to authenticated;

comment on function public.update_own_post_caption(bigint, text) is
  'Owner-only update of public.posts.content (caption). Does not touch media or counters.';
