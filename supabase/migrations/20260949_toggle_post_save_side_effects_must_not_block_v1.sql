-- UMTUBA: Save must persist even if notification / UM Points side-effects fail.
-- PRINT / write only. Do not apply from the app. Never supabase db push.
-- Owner applies this by hand in the Supabase SQL Editor after the READ-ONLY
-- diagnostic queries confirm the live function still matches 20260944
-- (SECURITY INVOKER + DECLARE-time um_points_config_value).

-- Cause: 20260944 rewrote toggle_post_save as SECURITY INVOKER. It calls
-- um_points_config_value in DECLARE (before any insert), then after a save
-- on someone else's video it calls create_notification, award_um_points_to_user,
-- and try_award_activity_score. Those helpers were revoked from PUBLIC and
-- never granted to authenticated. The permission error aborts the whole
-- transaction, so the bookmark never sticks. Like does not call those helpers.

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
  v_points int;
  v_cap int;
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
      begin
        v_points := public.um_points_config_value('creator_qualified_save', 3);
        v_cap := public.um_points_config_value('save_daily_cap_points', 30);
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

        perform public.award_um_points_to_user(
          v_owner,
          v_points,
          'qualified save',
          'creator_save:' || p_post_id::text || ':' || v_uid::text,
          jsonb_build_object(
            'category', 'save',
            'postId', p_post_id,
            'saverId', v_uid
          ),
          v_cap
        );

        perform public.try_award_activity_score(
          v_owner,
          public.activity_tier_config_value('score_save_received', 5),
          'engagement_received',
          'save received',
          'activity_save:' || p_post_id::text || ':' || v_uid::text,
          jsonb_build_object('postId', p_post_id, 'saverId', v_uid),
          v_uid,
          public.activity_tier_config_value('cap_engagement_received', 100)
        );
      exception
        when others then
          -- Bookmark row already written. Side-effects must not roll it back.
          null;
      end;
    end if;
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_save(bigint) from public;
grant execute on function public.toggle_post_save(bigint) to authenticated;

comment on function public.toggle_post_save(bigint) is
  'Toggle the caller''s bookmark. SECURITY DEFINER so notification/points helpers can run; those helpers are wrapped so a failure cannot unsave the row.';

commit;
