-- Phase B7: prune ghost live participants after missed leave/heartbeat.
-- Reviewed for invite-alpha. Apply manually in Supabase SQL Editor after live
-- foundation migrations. Do not auto-apply from the Next.js app.
--
-- Marks stale non-host viewers as left, then refreshes lobby viewer_count.
-- Intended for periodic ops/cron (not client-callable).
-- After apply, run scripts/verify-live-stale-participant-prune.sql.
-- Cron: .github/workflows/prune-stale-live-participants.yml (needs DATABASE_URL).

create or replace function public.prune_stale_live_participants(
  p_stale_seconds integer default 120
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale interval;
  v_room uuid;
  v_updated integer := 0;
begin
  if p_stale_seconds is null or p_stale_seconds < 60 then
    p_stale_seconds := 120;
  end if;
  v_stale := make_interval(secs => p_stale_seconds);

  update public.live_participants lp
  set left_at = now()
  where lp.left_at is null
    and coalesce(lp.role, '') is distinct from 'host'
    and lp.last_seen_at < now() - v_stale;

  get diagnostics v_updated = row_count;

  for v_room in
    select distinct lp.room_id
    from public.live_participants lp
    where lp.left_at is not null
      and lp.left_at > now() - interval '5 minutes'
  loop
    perform public.refresh_live_room_viewer_count(v_room);
  end loop;

  return coalesce(v_updated, 0);
end;
$$;

revoke all on function public.prune_stale_live_participants(integer) from public;
revoke all on function public.prune_stale_live_participants(integer) from anon, authenticated;

comment on function public.prune_stale_live_participants(integer) is
  'B7: Mark stale non-host live participants as left and refresh viewer counts. Ops/cron only.';
