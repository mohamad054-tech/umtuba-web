-- Live started notifications: fire on INSERT-as-live (create_live_room go_live=true).
--
-- Root cause:
--   notify_on_live_started + live_rooms_notify_started only handled UPDATE of status
--   when transitioning non-live → live. create_live_room(p_go_live := true) INSERTs
--   rows already with status='live', so followers never received live_started.
--
-- Behavior after this migration:
--   INSERT status=live          → notify followers (+ nearby when prefs/city match)
--   INSERT idle / non-live      → no notify
--   UPDATE non-live → live      → notify once (go_live_room path)
--   UPDATE live → live          → no duplicate
--   Host never notified (create_notification actor=recipient guard)
--   Preferences + dedupe_key honored via create_notification
--
-- Does not change create_live_room, nearby logic shape, or message types.

create or replace function public.notify_on_live_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  r record;
  v_city text;
  v_country text;
  v_should_notify boolean := false;
begin
  if tg_op = 'INSERT' and new.status = 'live' then
    v_should_notify := true;
  elsif tg_op = 'UPDATE'
     and old.status is distinct from 'live'
     and new.status = 'live' then
    v_should_notify := true;
  end if;

  if not v_should_notify then
    return new;
  end if;

  v_label := public.notification_actor_label(new.host_id);

  -- Followers (live_started)
  for r in
    select follower_id
    from public.profile_follows
    where following_id = new.host_id
  loop
    perform public.create_notification(
      r.follower_id,
      new.host_id,
      'live_started',
      v_label || ' is live now',
      nullif(btrim(coalesce(new.title, '')), ''),
      'live_room',
      new.id::text,
      '/live/' || new.id::text,
      jsonb_build_object('roomId', new.id, 'title', new.title),
      'live_started:' || new.id::text || ':' || r.follower_id::text
    );
  end loop;

  -- Nearby (nearby_live_started): approximate city match only; prefs default OFF
  v_city := nullif(lower(btrim(coalesce(new.city, ''))), '');
  v_country := nullif(btrim(coalesce(new.country, '')), '');

  if v_city is not null then
    for r in
      select p.id as user_id, p.city, p.country
      from public.profiles p
      join public.notification_preferences pref on pref.user_id = p.id
      where pref.nearby_live_enabled = true
        and p.id <> new.host_id
        and nullif(lower(btrim(coalesce(p.city, ''))), '') = v_city
        and not exists (
          select 1
          from public.profile_follows f
          where f.follower_id = p.id
            and f.following_id = new.host_id
        )
    loop
      perform public.create_notification(
        r.user_id,
        new.host_id,
        'nearby_live_started',
        'A live started near ' || btrim(coalesce(new.city, 'you')),
        case
          when v_country is not null then
            btrim(coalesce(new.city, '')) || ', ' || v_country
          else
            nullif(btrim(coalesce(new.city, '')), '')
        end,
        'live_room',
        new.id::text,
        '/live/' || new.id::text,
        jsonb_build_object(
          'roomId', new.id,
          'title', new.title,
          'city', nullif(btrim(coalesce(new.city, '')), ''),
          'country', v_country
          -- Never include latitude/longitude
        ),
        'nearby_live_started:' || new.id::text || ':' || r.user_id::text
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists live_rooms_notify_started on public.live_rooms;
create trigger live_rooms_notify_started
  after insert or update of status on public.live_rooms
  for each row execute function public.notify_on_live_started();

-- Trigger function must not be callable directly by clients.
revoke all on function public.notify_on_live_started() from public;
revoke all on function public.notify_on_live_started() from anon, authenticated;
