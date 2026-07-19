-- UMTUBA Beta Critical Fix V1: live_started on INSERT-as-live
-- Additive / idempotent. Replaces notify_on_live_started + trigger only.
--
-- Root cause: create_live_room(p_go_live := true) INSERTs live_rooms with
-- status='live'. The previous trigger was AFTER UPDATE OF status only, so
-- followers never received live_started / nearby_live_started on the primary
-- host path. go_live_room (idle → live UPDATE) already worked.
--
-- Behavior after this migration:
--   INSERT status=live              → notify once
--   INSERT status=idle (scheduled)  → no notify
--   INSERT other non-live           → no notify
--   UPDATE non-live → live          → notify once
--   UPDATE live → live              → no duplicate
--   host never notified for self    → create_notification actor=recipient guard
--   preferences + dedupe preserved  → via create_notification / dedupe_key

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
begin
  -- Fire only when the room becomes live (INSERT-as-live or transition to live).
  if new.status is distinct from 'live' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from 'live' then
    return new;
  end if;

  if tg_op not in ('INSERT', 'UPDATE') then
    return new;
  end if;

  v_label := public.notification_actor_label(new.host_id);

  -- Followers (V1). Exclude host explicitly; create_notification also skips
  -- actor=recipient, preference blocks, and unique(dedupe_key) races.
  for r in
    select follower_id
    from public.profile_follows
    where following_id = new.host_id
      and follower_id <> new.host_id
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

  -- Nearby (V2): approximate city match only; prefs default OFF; never exact coords.
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

comment on function public.notify_on_live_started() is
  'Notify followers (and opt-in nearby) when a live_room becomes live via INSERT or status UPDATE. Actor is always NEW.host_id from the row.';

revoke all on function public.notify_on_live_started() from public;
revoke all on function public.notify_on_live_started() from anon, authenticated;

drop trigger if exists live_rooms_notify_started on public.live_rooms;
create trigger live_rooms_notify_started
  after insert or update of status on public.live_rooms
  for each row execute function public.notify_on_live_started();
