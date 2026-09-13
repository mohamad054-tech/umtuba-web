-- Activity tier event wiring — award authentic activity score from real platform events.
-- Additive. Does not alter wallet / um_points systems beyond adding parallel awards.
-- Apply after 20260720_activity_tiers_foundation.sql.

-- ---------------------------------------------------------------------------
-- 1. Configurable score amounts + category caps
-- ---------------------------------------------------------------------------

insert into public.activity_tier_config (key, value, description) values
  ('score_quality_post', 40, 'Activity score for publishing a post'),
  ('cap_quality_posts', 120, 'Daily cap: quality_posts'),
  ('score_helpful_comment', 8, 'Activity score for a meaningful comment'),
  ('cap_helpful_comments', 80, 'Daily cap: helpful_comments'),
  ('score_like_received', 3, 'Creator score when someone likes their post'),
  ('score_save_received', 5, 'Creator score when someone saves their post'),
  ('score_share_received', 8, 'Creator score when someone shares their post'),
  ('cap_engagement_received', 100, 'Daily cap: engagement_received'),
  ('score_live_join', 10, 'Score for joining a live room'),
  ('score_live_host', 25, 'Score for hosting / going live'),
  ('cap_live_participation', 100, 'Daily cap: live_participation'),
  ('score_verified_referral', 75, 'Score when an invited user becomes active'),
  ('cap_verified_referrals', 150, 'Daily cap: verified_referrals'),
  ('score_community_follow', 5, 'Score for following another creator'),
  ('cap_community_contributions', 80, 'Daily cap: community_contributions'),
  ('score_consistency_day', 15, 'Daily consistency award on first quality post'),
  ('cap_consistency_tenure', 30, 'Daily cap: consistency_tenure'),
  ('score_tenure_milestone', 20, 'Account tenure milestone (30d+) once'),
  ('comment_min_length', 20, 'Min trimmed comment length for helpful_comments'),
  ('screen_time_unit', 1, 'Secondary screen-time points per qualified unit')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Safe wrapper: self-interaction block + category caps from config
-- ---------------------------------------------------------------------------

create or replace function public.try_award_activity_score(
  p_user_id uuid,
  p_points integer,
  p_category text,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null,
  p_category_cap integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap integer := p_category_cap;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'invalid');
  end if;

  if p_actor_user_id is not null and p_actor_user_id = p_user_id then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'self_interaction');
  end if;

  if v_cap is null then
    v_cap := case p_category
      when 'quality_posts' then public.activity_tier_config_value('cap_quality_posts', 120)
      when 'helpful_comments' then public.activity_tier_config_value('cap_helpful_comments', 80)
      when 'engagement_received' then public.activity_tier_config_value('cap_engagement_received', 100)
      when 'live_participation' then public.activity_tier_config_value('cap_live_participation', 100)
      when 'community_contributions' then public.activity_tier_config_value('cap_community_contributions', 80)
      when 'verified_referrals' then public.activity_tier_config_value('cap_verified_referrals', 150)
      when 'consistency_tenure' then public.activity_tier_config_value('cap_consistency_tenure', 30)
      when 'screen_time_secondary' then public.activity_tier_config_value('screen_time_daily_max', 20)
      else null
    end;
  end if;

  return public.award_activity_score_to_user(
    p_user_id,
    p_points,
    p_category,
    p_reason,
    p_dedupe_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('actorUserId', p_actor_user_id),
    v_cap
  );
end;
$$;

revoke all on function public.try_award_activity_score(
  uuid, integer, text, text, text, jsonb, uuid, integer
) from public;

-- Capped secondary screen-time RPC (requires primary activity same day via award gate).
create or replace function public.record_screen_time_activity(p_units integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_units integer := greatest(least(coalesce(p_units, 1), 5), 0);
  v_points integer;
  v_minute text := to_char(date_trunc('minute', timezone('utc', now())), 'YYYYMMDDHH24MI');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if v_units <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_points := v_units * public.activity_tier_config_value('screen_time_unit', 1);

  return public.try_award_activity_score(
    v_uid,
    v_points,
    'screen_time_secondary',
    'qualified active session (secondary)',
    'screen_time:' || v_uid::text || ':' || v_minute,
    jsonb_build_object('units', v_units, 'secondaryOnly', true),
    null,
    public.activity_tier_config_value('screen_time_daily_max', 20)
  );
end;
$$;

revoke all on function public.record_screen_time_activity(integer) from public;
grant execute on function public.record_screen_time_activity(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Quality posts + consistency + verified referrals
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_first_post_of_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := public.um_points_config_value('first_post_of_day', 25);
  v_invite_points integer := public.um_points_config_value('invite_active', 50);
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  v_inviter uuid;
  v_invite_id uuid;
  v_created timestamptz;
  v_age_days integer;
begin
  if new.user_id is null then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'first post of the day',
    'first_post_of_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('category', 'create', 'postId', new.id),
    null
  );

  perform public.try_award_activity_score(
    new.user_id,
    public.activity_tier_config_value('score_quality_post', 40),
    'quality_posts',
    'published quality post',
    'activity_quality_post:' || new.id::text,
    jsonb_build_object('postId', new.id),
    null,
    public.activity_tier_config_value('cap_quality_posts', 120)
  );

  perform public.try_award_activity_score(
    new.user_id,
    public.activity_tier_config_value('score_consistency_day', 15),
    'consistency_tenure',
    'daily posting consistency',
    'activity_consistency_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('postId', new.id),
    null,
    public.activity_tier_config_value('cap_consistency_tenure', 30)
  );

  select created_at into v_created from public.profiles where id = new.user_id;
  if v_created is not null then
    v_age_days := greatest(
      0,
      floor(extract(epoch from (now() - v_created)) / 86400)::integer
    );
    if v_age_days >= 30 then
      perform public.try_award_activity_score(
        new.user_id,
        public.activity_tier_config_value('score_tenure_milestone', 20),
        'consistency_tenure',
        'account tenure milestone (30d+)',
        'activity_tenure_30d:' || new.user_id::text,
        jsonb_build_object('ageDays', v_age_days),
        null,
        public.activity_tier_config_value('cap_consistency_tenure', 30)
      );
    end if;
  end if;

  select id, inviter_id into v_invite_id, v_inviter
  from public.user_invites
  where invitee_id = new.user_id
    and rewarded_at is null
    and claimed_at is not null
  limit 1;

  if v_inviter is not null and v_invite_id is not null then
    update public.user_invites
    set rewarded_at = now()
    where id = v_invite_id
      and rewarded_at is null;

    if found then
      perform public.award_um_points_to_user(
        v_inviter,
        v_invite_points,
        'invited user became active',
        'invite_active:' || v_invite_id::text,
        jsonb_build_object(
          'category', 'invite',
          'inviteeId', new.user_id,
          'inviteId', v_invite_id
        ),
        null
      );

      perform public.try_award_activity_score(
        v_inviter,
        public.activity_tier_config_value('score_verified_referral', 75),
        'verified_referrals',
        'verified active referral',
        'activity_referral:' || v_invite_id::text,
        jsonb_build_object('inviteeId', new.user_id, 'inviteId', v_invite_id),
        new.user_id,
        public.activity_tier_config_value('cap_verified_referrals', 150)
      );
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Meaningful comments
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_meaningful_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int := public.um_points_config_value('comment_min_length', 20);
  v_points int := public.um_points_config_value('meaningful_comment', 5);
  v_cap int := public.um_points_config_value('comment_daily_cap_points', 25);
  v_owner uuid;
  v_act_min int := public.activity_tier_config_value('comment_min_length', 20);
begin
  if new.user_id is null then
    return new;
  end if;

  if char_length(btrim(coalesce(new.body, ''))) < greatest(v_min, v_act_min) then
    return new;
  end if;

  select user_id into v_owner from public.posts where id = new.post_id;

  if v_owner is not null and v_owner = new.user_id then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'meaningful engagement',
    'meaningful_comment:' || new.id::text,
    jsonb_build_object(
      'category', 'comment',
      'postId', new.post_id,
      'commentId', new.id
    ),
    v_cap
  );

  -- Commenter earns helpful_comments (own authentic action — actor null)
  perform public.try_award_activity_score(
    new.user_id,
    public.activity_tier_config_value('score_helpful_comment', 8),
    'helpful_comments',
    'helpful comment',
    'activity_comment:' || new.id::text,
    jsonb_build_object('postId', new.post_id, 'commentId', new.id),
    null,
    public.activity_tier_config_value('cap_helpful_comments', 80)
  );

  if v_owner is not null then
    perform public.try_award_activity_score(
      v_owner,
      public.activity_tier_config_value('score_like_received', 3),
      'engagement_received',
      'received helpful comment',
      'activity_comment_recv:' || new.id::text,
      jsonb_build_object('postId', new.post_id, 'commentId', new.id),
      new.user_id,
      public.activity_tier_config_value('cap_engagement_received', 100)
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Likes received (trigger — no self-reward)
-- ---------------------------------------------------------------------------

create or replace function public.award_activity_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null then
    return new;
  end if;

  perform public.try_award_activity_score(
    v_owner,
    public.activity_tier_config_value('score_like_received', 3),
    'engagement_received',
    'like received',
    'activity_like:' || new.post_id::text || ':' || new.user_id::text,
    jsonb_build_object('postId', new.post_id),
    new.user_id,
    public.activity_tier_config_value('cap_engagement_received', 100)
  );

  return new;
end;
$$;

drop trigger if exists post_likes_activity_tier on public.post_likes;
create trigger post_likes_activity_tier
  after insert on public.post_likes
  for each row execute function public.award_activity_on_post_like();

-- ---------------------------------------------------------------------------
-- 6. Saves / shares received (patch latest RPCs from event wiring)
-- ---------------------------------------------------------------------------

create or replace function public.toggle_post_save(p_post_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved boolean;
  v_count integer;
  v_deleted integer;
  v_owner uuid;
  v_points int := public.um_points_config_value('creator_qualified_save', 3);
  v_cap int := public.um_points_config_value('save_daily_cap_points', 30);
  v_label text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null then
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
    end if;
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

create or replace function public.record_post_share(
  p_post_id bigint,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_window interval := interval '1 hour';
  v_prev timestamptz;
  v_counted boolean := false;
  v_count integer;
  v_inserted integer;
  v_owner uuid;
  v_points int := public.um_points_config_value('creator_qualified_share', 5);
  v_cap int := public.um_points_config_value('share_daily_cap_points', 20);
  v_label text;
  v_day text := to_char(date_trunc('day', timezone('utc', now())), 'YYYYMMDD');
begin
  v_key := public.resolve_interaction_viewer_key(p_viewer_key);

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null then
    raise exception 'Post not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('post_share:' || p_post_id::text || ':' || v_key)
  );

  select last_shared_at into v_prev
  from public.post_shares
  where post_id = p_post_id
    and viewer_key = v_key;

  if v_prev is null then
    insert into public.post_shares (post_id, viewer_key, user_id, last_shared_at)
    values (p_post_id, v_key, v_uid, now())
    on conflict (post_id, viewer_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  elsif now() - v_prev >= v_window then
    update public.post_shares
    set last_shared_at = now(),
        user_id = coalesce(v_uid, user_id)
    where post_id = p_post_id
      and viewer_key = v_key
      and last_shared_at = v_prev;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  end if;

  if v_counted and v_owner is not null and (v_uid is null or v_owner <> v_uid) then
    if v_uid is not null then
      v_label := public.notification_actor_label(v_uid);
      perform public.create_notification(
        v_owner,
        v_uid,
        'post_share',
        v_label || ' shared your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id, 'sharerId', v_uid),
        'post_share:' || p_post_id::text || ':' || v_uid::text || ':' || v_day
      );
    else
      perform public.create_notification(
        v_owner,
        null,
        'post_share',
        'Someone shared your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id),
        'post_share:' || p_post_id::text || ':' || v_key || ':' || v_day
      );
    end if;

    perform public.award_um_points_to_user(
      v_owner,
      v_points,
      'qualified share',
      'creator_share:' || p_post_id::text || ':' || v_key || ':' || v_day,
      jsonb_build_object(
        'category', 'share',
        'postId', p_post_id,
        'viewerKey', v_key
      ),
      v_cap
    );

    perform public.try_award_activity_score(
      v_owner,
      public.activity_tier_config_value('score_share_received', 8),
      'engagement_received',
      'share received',
      'activity_share:' || p_post_id::text || ':' || v_key || ':' || v_day,
      jsonb_build_object('postId', p_post_id, 'viewerKey', v_key),
      v_uid,
      public.activity_tier_config_value('cap_engagement_received', 100)
    );
  end if;

  select shares into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'counted', v_counted,
    'shares', coalesce(v_count, 0)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Live participation + hosting
-- ---------------------------------------------------------------------------

create or replace function public.award_activity_on_live_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  v_host uuid;
  v_is_join boolean := false;
begin
  if new.user_id is null or new.is_banned then
    return new;
  end if;

  if tg_op = 'INSERT' and new.left_at is null then
    v_is_join := true;
  elsif tg_op = 'UPDATE'
    and new.left_at is null
    and (old.left_at is not null or old.last_seen_at is distinct from new.last_seen_at)
    and (old.left_at is not null)
  then
    v_is_join := true;
  end if;

  if not v_is_join then
    return new;
  end if;

  select host_id into v_host from public.live_rooms where id = new.room_id;

  if new.role = 'host' or (v_host is not null and v_host = new.user_id) then
    perform public.try_award_activity_score(
      new.user_id,
      public.activity_tier_config_value('score_live_host', 25),
      'live_participation',
      'hosted live session',
      'activity_live_host:' || new.room_id::text || ':' || new.user_id::text || ':' || v_day,
      jsonb_build_object('roomId', new.room_id, 'role', new.role),
      null,
      public.activity_tier_config_value('cap_live_participation', 100)
    );
  else
    perform public.try_award_activity_score(
      new.user_id,
      public.activity_tier_config_value('score_live_join', 10),
      'live_participation',
      'joined live room',
      'activity_live_join:' || new.room_id::text || ':' || new.user_id::text || ':' || v_day,
      jsonb_build_object('roomId', new.room_id, 'role', new.role),
      null,
      public.activity_tier_config_value('cap_live_participation', 100)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists live_participants_activity_tier on public.live_participants;
create trigger live_participants_activity_tier
  after insert or update on public.live_participants
  for each row execute function public.award_activity_on_live_participant();

create or replace function public.award_activity_on_live_room_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
begin
  if new.status = 'live'
    and (tg_op = 'INSERT' or old.status is distinct from 'live')
    and new.host_id is not null
  then
    perform public.try_award_activity_score(
      new.host_id,
      public.activity_tier_config_value('score_live_host', 25),
      'live_participation',
      'went live',
      'activity_go_live:' || new.id::text || ':' || v_day,
      jsonb_build_object('roomId', new.id),
      null,
      public.activity_tier_config_value('cap_live_participation', 100)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists live_rooms_activity_tier on public.live_rooms;
create trigger live_rooms_activity_tier
  after insert or update of status on public.live_rooms
  for each row execute function public.award_activity_on_live_room_status();

-- ---------------------------------------------------------------------------
-- 8. Community contributions (follows)
-- ---------------------------------------------------------------------------

create or replace function public.award_activity_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id is null or new.following_id is null then
    return new;
  end if;

  perform public.try_award_activity_score(
    new.follower_id,
    public.activity_tier_config_value('score_community_follow', 5),
    'community_contributions',
    'followed a creator',
    'activity_follow:' || new.follower_id::text || ':' || new.following_id::text,
    jsonb_build_object('followingId', new.following_id),
    null,
    public.activity_tier_config_value('cap_community_contributions', 80)
  );

  perform public.try_award_activity_score(
    new.following_id,
    public.activity_tier_config_value('score_like_received', 3),
    'engagement_received',
    'gained a follower',
    'activity_followed:' || new.following_id::text || ':' || new.follower_id::text,
    jsonb_build_object('followerId', new.follower_id),
    new.follower_id,
    public.activity_tier_config_value('cap_engagement_received', 100)
  );

  return new;
end;
$$;

drop trigger if exists profile_follows_activity_tier on public.profile_follows;
create trigger profile_follows_activity_tier
  after insert on public.profile_follows
  for each row execute function public.award_activity_on_follow();

-- ---------------------------------------------------------------------------
-- 9. Verified welcome → consistency/tenure bootstrap (parallel to UM Points)
-- ---------------------------------------------------------------------------

create or replace function public.claim_verified_welcome_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_points integer := public.um_points_config_value('verified_welcome', 100);
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select email_confirmed_at into v_confirmed
  from auth.users
  where id = v_uid;

  if v_confirmed is null then
    return jsonb_build_object('created', false, 'reason', 'not_verified');
  end if;

  v_result := public.award_um_points_to_user(
    v_uid,
    v_points,
    'verified account welcome',
    'verified_welcome:' || v_uid::text,
    jsonb_build_object('category', 'welcome'),
    null
  );

  perform public.try_award_activity_score(
    v_uid,
    public.activity_tier_config_value('score_tenure_milestone', 20),
    'consistency_tenure',
    'verified account tenure start',
    'activity_verified_welcome:' || v_uid::text,
    jsonb_build_object('category', 'welcome'),
    null,
    public.activity_tier_config_value('cap_consistency_tenure', 30)
  );

  return v_result;
end;
$$;

revoke all on function public.claim_verified_welcome_bonus() from public;
grant execute on function public.claim_verified_welcome_bonus() to authenticated;
