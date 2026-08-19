-- Social Sound Library V1
-- Additive / idempotent. Fail-closed RLS. User JWT only (no service-role client).
-- Targeted production apply authorized by CENTRAL_COMBINED_MOBILE_EDITOR_SOUND_FINALIZE_V1.
-- Use `supabase db query --linked -f` then `migration repair --status applied`. Never `db push`.
--
-- Version 20260932: after applied 20260930.
-- Do not reuse 20260929 (local-only, never applied) or 20260931 (rewards HOLD).
--
-- Rights gate: uploading audio is NOT permission to redistribute.
-- Default visibility is private. Public reuse requires an explicit RPC
-- confirm_social_sound_reuse_rights after the owner asserts rights.

create table if not exists public.social_sounds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null
    check (source_type in ('uploaded', 'original_video', 'platform')),
  source_video_id bigint,
  parent_sound_id uuid references public.social_sounds (id) on delete set null,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  storage_bucket text not null default 'social-sounds'
    check (storage_bucket = 'social-sounds'),
  storage_path text
    check (
      storage_path is null
      or (
        char_length(storage_path) between 8 and 400
        and storage_path not like '%..%'
      )
    ),
  duration_ms integer
    check (duration_ms is null or (duration_ms >= 250 and duration_ms <= 600000)),
  waveform jsonb,
  created_at timestamptz not null default now(),
  visibility text not null default 'private'
    check (visibility in ('private', 'owner_only', 'public_reusable')),
  reuse_permission text not null default 'none'
    check (reuse_permission in ('none', 'owner_only', 'public')),
  rights_status text not null default 'unverified'
    check (
      rights_status in (
        'unverified',
        'owner_confirmed',
        'platform_licensed',
        'blocked',
        'takedown'
      )
    ),
  rights_confirmed_at timestamptz,
  rights_confirmation_text text
    check (
      rights_confirmation_text is null
      or char_length(btrim(rights_confirmation_text)) between 8 and 400
    ),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'clean', 'flagged', 'blocked')),
  usage_count integer not null default 0
    check (usage_count >= 0),
  constraint social_sounds_platform_licensed_ok check (
    source_type <> 'platform'
    or (
      rights_status = 'platform_licensed'
      and visibility = 'public_reusable'
      and reuse_permission = 'public'
    )
  ),
  constraint social_sounds_public_reuse_ok check (
    visibility <> 'public_reusable'
    or (
      reuse_permission = 'public'
      and rights_status in ('owner_confirmed', 'platform_licensed')
      and rights_confirmed_at is not null
    )
  ),
  constraint social_sounds_blocked_not_public check (
    rights_status not in ('blocked', 'takedown')
    or visibility <> 'public_reusable'
  )
);

comment on table public.social_sounds is
  'Canonical reusable SOCIAL SOUND entity. Upload is not redistribution permission. Public reuse is opt-in via RPC + RLS.';

create index if not exists social_sounds_owner_idx
  on public.social_sounds (owner_user_id, created_at desc);

create index if not exists social_sounds_public_trend_idx
  on public.social_sounds (usage_count desc, created_at desc)
  where visibility = 'public_reusable'
    and rights_status in ('owner_confirmed', 'platform_licensed')
    and moderation_status <> 'blocked';

create index if not exists social_sounds_parent_idx
  on public.social_sounds (parent_sound_id)
  where parent_sound_id is not null;

alter table public.social_sounds enable row level security;
alter table public.social_sounds force row level security;

revoke all on table public.social_sounds from public;
revoke all on table public.social_sounds from anon;
revoke all on table public.social_sounds from authenticated;
grant select, insert, update on table public.social_sounds to authenticated;
grant all on table public.social_sounds to service_role;

create or replace function public.social_sound_is_publicly_reusable(
  p_visibility text,
  p_reuse_permission text,
  p_rights_status text,
  p_moderation_status text,
  p_rights_confirmed_at timestamptz
)
returns boolean
language sql
immutable
as $$
  select
    p_visibility = 'public_reusable'
    and p_reuse_permission = 'public'
    and p_rights_status in ('owner_confirmed', 'platform_licensed')
    and p_moderation_status <> 'blocked'
    and p_rights_status not in ('blocked', 'takedown')
    and p_rights_confirmed_at is not null;
$$;

revoke all on function public.social_sound_is_publicly_reusable(text, text, text, text, timestamptz) from public, anon;
grant execute on function public.social_sound_is_publicly_reusable(text, text, text, text, timestamptz) to authenticated, service_role;

drop policy if exists "social_sounds_select_owner_or_public" on public.social_sounds;
create policy "social_sounds_select_owner_or_public"
  on public.social_sounds
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
    or public.social_sound_is_publicly_reusable(
      visibility,
      reuse_permission,
      rights_status,
      moderation_status,
      rights_confirmed_at
    )
  );

drop policy if exists "social_sounds_insert_own_private" on public.social_sounds;
create policy "social_sounds_insert_own_private"
  on public.social_sounds
  for insert
  to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and visibility in ('private', 'owner_only')
    and reuse_permission = 'none'
    and rights_status = 'unverified'
    and rights_confirmed_at is null
    and source_type in ('uploaded', 'original_video')
  );

drop policy if exists "social_sounds_update_owner_safe" on public.social_sounds;
create policy "social_sounds_update_owner_safe"
  on public.social_sounds
  for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (
    owner_user_id = (select auth.uid())
    and visibility in ('private', 'owner_only')
    and reuse_permission = 'none'
    and rights_status in ('unverified', 'blocked', 'takedown')
    and rights_confirmed_at is null
  );

create table if not exists public.social_sound_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  sound_id uuid not null references public.social_sounds (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, sound_id)
);

comment on table public.social_sound_saves is
  'Per-user saved/favorite social sounds. Save does not grant reuse of private sounds.';

alter table public.social_sound_saves enable row level security;
alter table public.social_sound_saves force row level security;

revoke all on table public.social_sound_saves from public;
revoke all on table public.social_sound_saves from anon;
revoke all on table public.social_sound_saves from authenticated;
grant select, insert, delete on table public.social_sound_saves to authenticated;
grant all on table public.social_sound_saves to service_role;

drop policy if exists "social_sound_saves_own" on public.social_sound_saves;
create policy "social_sound_saves_own"
  on public.social_sound_saves
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.social_sound_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  sound_id uuid not null references public.social_sounds (id) on delete cascade,
  reason_code text not null
    check (
      reason_code in (
        'spam',
        'harassment',
        'hate',
        'sexual',
        'violence',
        'illegal',
        'impersonation',
        'copyright',
        'other'
      )
    ),
  reason_detail text
    check (
      reason_detail is null
      or char_length(btrim(reason_detail)) between 1 and 1000
    ),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

comment on table public.social_sound_reports is
  'Sound-library reports. Complements 20260928 ugc_reports (posts/users only). Does not rewrite 20260928.';

create unique index if not exists social_sound_reports_open_uidx
  on public.social_sound_reports (reporter_id, sound_id)
  where status = 'open';

alter table public.social_sound_reports enable row level security;
alter table public.social_sound_reports force row level security;

revoke all on table public.social_sound_reports from public;
revoke all on table public.social_sound_reports from anon;
revoke all on table public.social_sound_reports from authenticated;
grant select, insert on table public.social_sound_reports to authenticated;
grant all on table public.social_sound_reports to service_role;

drop policy if exists "social_sound_reports_own_or_admin" on public.social_sound_reports;
create policy "social_sound_reports_own_or_admin"
  on public.social_sound_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "social_sound_reports_insert_own" on public.social_sound_reports;
create policy "social_sound_reports_insert_own"
  on public.social_sound_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

alter table public.posts
  add column if not exists sound_id uuid references public.social_sounds (id) on delete set null;

alter table public.posts
  add column if not exists sound_mix jsonb not null default jsonb_build_object(
    'originalAudioEnabled', true,
    'originalAudioVolume', 1,
    'addedSoundVolume', 1,
    'soundStartOffsetMs', 0
  );

create index if not exists posts_sound_id_idx
  on public.posts (sound_id)
  where sound_id is not null;

comment on column public.posts.sound_id is
  'Canonical social_sounds.id used by this video. Mix params live in sound_mix.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-sounds',
  'social-sounds',
  false,
  10485760,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/aac']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload own social sounds" on storage.objects;
drop policy if exists "Owners read own social sounds" on storage.objects;
drop policy if exists "Reusable social sounds readable" on storage.objects;
drop policy if exists "Admins read social sounds" on storage.objects;

create policy "Owners upload own social sounds"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'social-sounds'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners read own social sounds"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'social-sounds'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Reusable social sounds readable"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'social-sounds'
    and exists (
      select 1
      from public.social_sounds s
      where s.storage_bucket = 'social-sounds'
        and s.storage_path = name
        and public.social_sound_is_publicly_reusable(
          s.visibility,
          s.reuse_permission,
          s.rights_status,
          s.moderation_status,
          s.rights_confirmed_at
        )
    )
  );

create policy "Admins read social sounds"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'social-sounds'
    and public.is_platform_admin((select auth.uid()))
  );

create or replace function public.confirm_social_sound_reuse_rights(
  p_sound_id uuid,
  p_confirmation text
)
returns public.social_sounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.social_sounds;
  v_text text := btrim(coalesce(p_confirmation, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if char_length(v_text) < 8 then
    raise exception 'Rights confirmation is required';
  end if;

  select * into v_row
  from public.social_sounds
  where id = p_sound_id
    and owner_user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Sound not found';
  end if;
  if v_row.rights_status in ('blocked', 'takedown') then
    raise exception 'Sound is blocked';
  end if;
  if v_row.source_type = 'platform' then
    raise exception 'Platform sounds are already licensed';
  end if;

  update public.social_sounds
  set
    visibility = 'public_reusable',
    reuse_permission = 'public',
    rights_status = 'owner_confirmed',
    rights_confirmed_at = now(),
    rights_confirmation_text = v_text,
    moderation_status = case
      when moderation_status = 'blocked' then moderation_status
      else 'pending'
    end
  where id = p_sound_id
    and owner_user_id = (select auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.confirm_social_sound_reuse_rights(uuid, text) from public, anon;
grant execute on function public.confirm_social_sound_reuse_rights(uuid, text) to authenticated;

create or replace function public.block_social_sound_reuse(
  p_sound_id uuid
)
returns public.social_sounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.social_sounds;
begin
  if not public.is_platform_admin((select auth.uid())) then
    raise exception 'Admin required';
  end if;

  update public.social_sounds
  set
    visibility = 'private',
    reuse_permission = 'none',
    rights_status = 'takedown',
    moderation_status = 'blocked'
  where id = p_sound_id
  returning * into v_row;

  if not found then
    raise exception 'Sound not found';
  end if;
  return v_row;
end;
$$;

revoke all on function public.block_social_sound_reuse(uuid) from public, anon;
grant execute on function public.block_social_sound_reuse(uuid) to authenticated;

create or replace function public.search_social_sounds(
  p_query text default '',
  p_limit integer default 20
)
returns setof public.social_sounds
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.social_sounds s
  where public.social_sound_is_publicly_reusable(
      s.visibility,
      s.reuse_permission,
      s.rights_status,
      s.moderation_status,
      s.rights_confirmed_at
    )
    and (
      btrim(coalesce(p_query, '')) = ''
      or s.title ilike '%' || btrim(p_query) || '%'
    )
  order by s.usage_count desc, s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.search_social_sounds(text, integer) from public, anon;
grant execute on function public.search_social_sounds(text, integer) to authenticated;

create or replace function public.list_trending_social_sounds(
  p_limit integer default 20
)
returns setof public.social_sounds
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.search_social_sounds('', p_limit);
$$;

revoke all on function public.list_trending_social_sounds(integer) from public, anon;
grant execute on function public.list_trending_social_sounds(integer) to authenticated;

create or replace function public.save_social_sound(p_sound_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  insert into public.social_sound_saves (user_id, sound_id)
  values ((select auth.uid()), p_sound_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.save_social_sound(uuid) from public, anon;
grant execute on function public.save_social_sound(uuid) to authenticated;

create or replace function public.unsave_social_sound(p_sound_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.social_sound_saves
  where user_id = (select auth.uid())
    and sound_id = p_sound_id;
$$;

revoke all on function public.unsave_social_sound(uuid) from public, anon;
grant execute on function public.unsave_social_sound(uuid) to authenticated;

create or replace function public.social_sounds_bump_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sound_id is not null and (old.sound_id is distinct from new.sound_id) then
    update public.social_sounds
    set usage_count = usage_count + 1
    where id = new.sound_id
      and public.social_sound_is_publicly_reusable(
        visibility,
        reuse_permission,
        rights_status,
        moderation_status,
        rights_confirmed_at
      );
  end if;
  return new;
end;
$$;

drop trigger if exists social_sounds_bump_usage_on_post on public.posts;
create trigger social_sounds_bump_usage_on_post
  after insert or update of sound_id on public.posts
  for each row
  execute function public.social_sounds_bump_usage();

revoke all on function public.social_sounds_bump_usage() from public, anon;
