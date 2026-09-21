-- APPLIED TO PRODUCTION BY HAND 2026-09-20
-- toggle_post_save is SECURITY DEFINER with SET search_path = public.
-- Same bookmark + owner-notification logic as 20260944, but
-- award_um_points_to_user and try_award_activity_score are removed
-- because reward_on_save_created already rewards saver and creator.

begin;

create or replace function public.toggle_post_save(p_post_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved boolean;
  v_count integer;
  v_deleted integer;
  v_owner uuid;
  v_label text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  delete from public.post_saves
  where post_id = p_post_id
    and user_id = v_uid;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_saved := false;
  else
    insert into public.post_saves (user_id, post_id)
    values (v_uid, p_post_id)
    on conflict (user_id, post_id) do nothing;

    v_saved := exists (
      select 1 from public.post_saves
      where post_id = p_post_id and user_id = v_uid
    );

    if v_saved and v_owner is distinct from v_uid then
      v_label := public.notification_actor_label(v_uid);

      perform public.create_notification(
        v_owner,
        v_uid,
        'post_save',
        v_label || ' saved your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id, 'saverId', v_uid),
        'post_save:' || p_post_id::text || ':' || v_uid::text
      );
    end if;
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_save(bigint) from public, anon;
grant execute on function public.toggle_post_save(bigint) to authenticated;

commit;
