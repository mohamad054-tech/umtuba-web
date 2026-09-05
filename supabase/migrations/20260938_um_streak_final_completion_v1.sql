-- UM Streak final completion (candidate only, local apply).
-- Does not steal 20260935 / 20260936. Does not overwrite 20260937.
-- Production apply is forbidden.

-- Live NULL-safe state, including broken after a missed day.
create or replace function public.um_streak_derive_state(
  p_last_low date,
  p_last_high date,
  p_last_completed date,
  p_current integer,
  p_longest integer,
  p_today date
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_yesterday date := p_today - 1;
  v_low_today boolean := p_last_low is not distinct from p_today;
  v_high_today boolean := p_last_high is not distinct from p_today;
begin
  if p_last_completed is not distinct from p_today then
    return case when coalesce(p_current, 0) <= 1 then 'started' else 'active_today' end;
  end if;

  -- NULL-safe XOR. `TRUE <> NULL` is NULL in SQL and previously stored 'none'.
  if v_low_today is distinct from v_high_today then
    return 'waiting_for_friend';
  end if;

  if p_last_completed is not distinct from v_yesterday and coalesce(p_current, 0) > 0 then
    return 'at_risk';
  end if;

  if coalesce(p_longest, 0) > 0 and coalesce(p_current, 0) = 0 then
    return 'broken';
  end if;

  return 'none';
end;
$$;

revoke all on function public.um_streak_derive_state(date, date, date, integer, integer, date)
  from public, anon;
grant execute on function public.um_streak_derive_state(date, date, date, integer, integer, date)
  to authenticated, service_role;

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.um_streaks'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%streak_state%'
  loop
    execute format('alter table public.um_streaks drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.um_streaks
  add constraint um_streaks_streak_state_check
  check (
    streak_state in (
      'none',
      'started',
      'active_today',
      'waiting_for_friend',
      'you_need_to_reply',
      'at_risk',
      'broken'
    )
  );

create or replace function public.um_streak_apply_visual_event(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_event_id uuid,
  p_message_id uuid,
  p_occurred_at timestamptz
)
returns public.um_streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_low uuid;
  v_high uuid;
  v_key text;
  v_today date := public.um_streak_utc_day(p_occurred_at);
  v_yesterday date := public.um_streak_utc_day(p_occurred_at) - 1;
  v_row public.um_streaks%rowtype;
  v_sender_is_low boolean;
  v_sender_day date;
  v_badge integer;
begin
  if p_sender_id is null or p_recipient_id is null or p_sender_id = p_recipient_id then
    raise exception 'Invalid streak pair' using errcode = '22023';
  end if;

  if public.ugc_users_are_blocked(p_sender_id, p_recipient_id) then
    raise exception 'Cannot message a blocked user' using errcode = '42501';
  end if;

  if p_sender_id < p_recipient_id then
    v_low := p_sender_id;
    v_high := p_recipient_id;
  else
    v_low := p_recipient_id;
    v_high := p_sender_id;
  end if;
  v_key := v_low::text || ':' || v_high::text;

  insert into public.um_streaks (
    pair_key, user_low_id, user_high_id
  ) values (
    v_key, v_low, v_high
  )
  on conflict (pair_key) do update
    set updated_at = public.um_streaks.updated_at
  returning * into v_row;

  if exists (
    select 1 from public.um_streak_events e where e.event_id = p_event_id
  ) then
    return v_row;
  end if;

  v_sender_is_low := p_sender_id = v_low;
  v_sender_day := case
    when v_sender_is_low then v_row.last_qualifying_day_low
    else v_row.last_qualifying_day_high
  end;

  if v_sender_day is distinct from v_today then
    insert into public.um_streak_events (
      event_id, pair_key, sender_id, recipient_id, qualifying_day, message_id
    ) values (
      p_event_id, v_key, p_sender_id, p_recipient_id, v_today, p_message_id
    )
    on conflict (pair_key, sender_id, qualifying_day) do nothing;
  end if;

  if v_sender_day is distinct from v_today then
    if v_sender_is_low then
      v_row.last_qualifying_day_low := v_today;
    else
      v_row.last_qualifying_day_high := v_today;
    end if;
  end if;

  if v_row.last_completed_streak_day is not null
     and v_row.last_completed_streak_day < v_yesterday then
    v_row.current_streak := 0;
    v_row.last_completed_streak_day := null;
  end if;

  if v_row.last_qualifying_day_low is not distinct from v_today
     and v_row.last_qualifying_day_high is not distinct from v_today
     and v_row.last_completed_streak_day is distinct from v_today then
    if v_row.last_completed_streak_day is not distinct from v_yesterday then
      v_row.current_streak := v_row.current_streak + 1;
    else
      v_row.current_streak := 1;
    end if;
    v_row.last_completed_streak_day := v_today;
    if v_row.longest_streak < v_row.current_streak then
      v_row.longest_streak := v_row.current_streak;
    end if;
  end if;

  v_row.streak_state := public.um_streak_derive_state(
    v_row.last_qualifying_day_low,
    v_row.last_qualifying_day_high,
    v_row.last_completed_streak_day,
    v_row.current_streak,
    v_row.longest_streak,
    v_today
  );
  v_row.updated_at := now();

  update public.um_streaks
  set
    current_streak = v_row.current_streak,
    longest_streak = v_row.longest_streak,
    last_qualifying_day_low = v_row.last_qualifying_day_low,
    last_qualifying_day_high = v_row.last_qualifying_day_high,
    last_completed_streak_day = v_row.last_completed_streak_day,
    streak_state = v_row.streak_state,
    updated_at = v_row.updated_at
  where pair_key = v_key;

  foreach v_badge in array array[3, 7, 30, 100, 365]
  loop
    if v_row.longest_streak >= v_badge then
      insert into public.um_streak_badges (pair_key, days)
      values (v_key, v_badge)
      on conflict (pair_key, days) do nothing;
    end if;
  end loop;

  return v_row;
end;
$$;

revoke all on function public.um_streak_apply_visual_event(uuid, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.um_streak_apply_visual_event(uuid, uuid, uuid, uuid, timestamptz)
  to service_role;

create or replace function public.open_um_visual_message(p_message_id uuid)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.messages%rowtype;
  v_already_opened boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_row
  from public.messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found' using errcode = '02000';
  end if;

  if not public.is_conversation_participant(v_row.conversation_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  if v_row.sender_id is not null
     and public.ugc_users_are_blocked(v_uid, v_row.sender_id) then
    raise exception 'Cannot message a blocked user' using errcode = '42501';
  end if;

  if v_row.sender_id = v_uid then
    return v_row;
  end if;

  if v_row.message_type not in ('image', 'video') then
    raise exception 'Not a visual message' using errcode = '22023';
  end if;

  v_already_opened := v_row.visual_opened_at is not null;

  if not v_already_opened then
    update public.messages
    set
      visual_opened_at = now(),
      visual_expires_at = now()
    where id = p_message_id
    returning * into v_row;
    return v_row;
  end if;

  raise exception 'Visual message already opened' using errcode = 'P0001';
end;
$$;

revoke all on function public.open_um_visual_message(uuid) from public, anon;
grant execute on function public.open_um_visual_message(uuid) to authenticated;

create or replace function public.get_um_streak_for_conversation(p_conversation_id uuid)
returns table (
  pair_key text,
  current_streak integer,
  longest_streak integer,
  last_qualifying_day_low date,
  last_qualifying_day_high date,
  last_completed_streak_day date,
  streak_state text,
  user_low_id uuid,
  user_high_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_key text;
  v_today date := public.um_streak_utc_day(now());
  v_yesterday date := public.um_streak_utc_day(now()) - 1;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  select cp.user_id
    into v_peer
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> v_uid
  limit 1;

  if v_peer is null then
    return;
  end if;

  if public.ugc_users_are_blocked(v_uid, v_peer) then
    return;
  end if;

  v_key := public.um_streak_pair_key(v_uid, v_peer);

  return query
  select
    s.pair_key,
    case
      when s.last_completed_streak_day is not null
           and s.last_completed_streak_day < v_yesterday
        then 0
      else s.current_streak
    end,
    s.longest_streak,
    s.last_qualifying_day_low,
    s.last_qualifying_day_high,
    case
      when s.last_completed_streak_day is not null
           and s.last_completed_streak_day < v_yesterday
        then null::date
      else s.last_completed_streak_day
    end,
    public.um_streak_derive_state(
      s.last_qualifying_day_low,
      s.last_qualifying_day_high,
      case
        when s.last_completed_streak_day is not null
             and s.last_completed_streak_day < v_yesterday
          then null::date
        else s.last_completed_streak_day
      end,
      case
        when s.last_completed_streak_day is not null
             and s.last_completed_streak_day < v_yesterday
          then 0
        else s.current_streak
      end,
      s.longest_streak,
      v_today
    ),
    s.user_low_id,
    s.user_high_id
  from public.um_streaks s
  where s.pair_key = v_key;
end;
$$;

revoke all on function public.get_um_streak_for_conversation(uuid) from public, anon;
grant execute on function public.get_um_streak_for_conversation(uuid) to authenticated;
