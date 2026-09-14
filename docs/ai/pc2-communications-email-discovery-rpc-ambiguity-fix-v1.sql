-- LOCAL ONLY. Replace discover_user_by_email to match edited 20260936.
-- Method: 20260936 already in schema_migrations; do not replay the whole file.
-- Do not write hosted / --linked. Do not print secrets.

create or replace function public.discover_user_by_email(p_email text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_target uuid;
  v_find text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_email := public.comms_normalize_email(p_email);
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return;
  end if;

  -- Confirmed/eligible auth email only. Never select email into the result.
  select u.id into v_target
  from auth.users u
  where lower(btrim(u.email)) = v_email
    and u.email_confirmed_at is not null
  limit 1;

  if v_target is null then
    return;
  end if;

  insert into public.communication_privacy_settings (user_id)
  values (v_target)
  on conflict on constraint communication_privacy_settings_pkey do nothing;

  select s.find_by_email into v_find
  from public.communication_privacy_settings s
  where s.user_id = v_target;

  -- Default nobody. connections is not a stored value.
  if coalesce(v_find, 'nobody') <> 'everyone' then
    return;
  end if;

  return query
  select i.user_id, i.username, i.display_name, i.avatar_url
  from public.comms_public_identity(v_target) i;
end;
$$;

comment on function public.discover_user_by_email(text) is
  'Exact confirmed-email match inside SECURITY DEFINER. Returns public identity only. Same empty result for unknown and privacy-hidden.';

revoke all on function public.discover_user_by_email(text) from public;
grant execute on function public.discover_user_by_email(text) to authenticated;

create extension if not exists pgcrypto;

do $$
declare
  a uuid := '11111111-1111-4111-8111-aaaaaaaaaaa1';
  b uuid := '22222222-2222-4222-8222-bbbbbbbbbbb2';
  c uuid := '33333333-3333-4333-8333-ccccccccccc3';
  v_user text;
  v_id uuid;
  v_empty int;
  v_priv_count int;
  v_find text;
  v_priv_cross int;
  v_place_public int;
  v_place_only int;
  v_conv uuid;
  v_fn text;
begin
  delete from auth.users where id in (a, b, c);

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gate.a@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"gateusera","full_name":"Gate User A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gate.b@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"gateuserb","full_name":"Gate User B"}'::jsonb, now(), now()),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gate.c@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"gateuserc","full_name":"Gate User C"}'::jsonb, now(), now());

  insert into public.profiles (id, full_name, username, display_name, avatar_initial)
  values
    (a, 'Gate User A', 'gateusera', 'Gate A', 'G'),
    (b, 'Gate User B', 'gateuserb', 'Gate B', 'G'),
    (c, 'Gate User C', 'gateuserc', 'Gate C', 'G')
  on conflict (id) do update
    set username = excluded.username, display_name = excluded.display_name;

  insert into public.communication_privacy_settings (user_id, find_by_email)
  values (a, 'everyone')
  on conflict on constraint communication_privacy_settings_pkey do update
    set find_by_email = 'everyone', updated_at = now();

  delete from public.communication_privacy_settings where user_id = c;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select i.user_id, i.username into v_id, v_user
  from public.discover_user_by_email('gate.a@local.test') i;
  if v_id is distinct from a or v_user is distinct from 'gateusera' then
    raise exception 'EMAIL_EXISTING_USER=FAIL id=% user=%', v_id, v_user;
  end if;
  raise notice 'EMAIL_EXISTING_USER=PASS';

  select count(*) into v_empty
  from public.discover_user_by_email('nobody-here@local.test');
  if v_empty <> 0 then
    raise exception 'EMAIL_NOT_FOUND=FAIL count=%', v_empty;
  end if;
  raise notice 'EMAIL_NOT_FOUND=PASS';

  -- C has no privacy row: RPC upserts default nobody, then hides.
  select count(*) into v_empty
  from public.discover_user_by_email('gate.c@local.test');
  if v_empty <> 0 then
    raise exception 'EMAIL_PRIVACY=FAIL count=%', v_empty;
  end if;
  select find_by_email, count(*) into v_find, v_priv_count
  from public.communication_privacy_settings
  where user_id = c
  group by find_by_email;
  if v_priv_count <> 1 or v_find <> 'nobody' then
    raise exception 'EMAIL_PRIVACY_DEFAULT_ROW=FAIL find=% count=%', v_find, v_priv_count;
  end if;
  raise notice 'EMAIL_PRIVACY=PASS';

  -- Duplicate call: same discoverable user, same empty hidden user. No ambiguity.
  begin
    select i.user_id into v_id from public.discover_user_by_email('gate.a@local.test') i;
    if v_id is distinct from a then
      raise exception 'DUPLICATE_CALL=FAIL first-user';
    end if;
    select i.user_id into v_id from public.discover_user_by_email('gate.a@local.test') i;
    if v_id is distinct from a then
      raise exception 'DUPLICATE_CALL=FAIL second-user';
    end if;
    select count(*) into v_empty from public.discover_user_by_email('gate.c@local.test');
    if v_empty <> 0 then
      raise exception 'DUPLICATE_CALL=FAIL privacy-leak';
    end if;
    select count(*) into v_priv_count
    from public.communication_privacy_settings
    where user_id in (a, c);
    if v_priv_count <> 2 then
      raise exception 'DUPLICATE_CALL=FAIL extra-rows count=%', v_priv_count;
    end if;
    raise notice 'DUPLICATE_CALL=PASS';
    raise notice 'ON_CONFLICT_AMBIGUITY=PASS';
  exception
    when others then
      if sqlerrm ilike '%ambiguous%' then
        raise exception 'ON_CONFLICT_AMBIGUITY=FAIL sqlstate=% msg=%', sqlstate, sqlerrm;
      end if;
      raise;
  end;

  select pg_get_functiondef('public.discover_user_by_email(text)'::regprocedure) into v_fn;
  if v_fn not ilike '%on conflict on constraint communication_privacy_settings_pkey%' then
    raise exception 'LIVE_FN_CONSTRAINT=FAIL';
  end if;
  if v_fn ilike '%on conflict (user_id)%' then
    raise exception 'LIVE_FN_STILL_COLUMN_CONFLICT=FAIL';
  end if;
  raise notice 'LIVE_FN_NAMED_CONSTRAINT=PASS';

  -- RLS as B
  perform set_config('role', 'authenticated', true);
  select count(*) into v_priv_cross
  from public.communication_privacy_settings
  where user_id = a;
  if v_priv_cross <> 0 then
    raise exception 'RLS_PRIVACY_CROSS=FAIL count=%', v_priv_cross;
  end if;
  raise notice 'RLS_PRIVACY_CROSS=PASS';

  perform set_config('role', 'postgres', true);
  insert into public.profile_places (profile_id, place_kind, label, city, visibility)
  values (a, 'current_city', 'Cairo', 'Cairo', 'public')
  on conflict do nothing;
  insert into public.profile_places (profile_id, place_kind, label, city, visibility)
  values (a, 'hometown', 'Only me town', 'Privateville', 'only_me')
  on conflict do nothing;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_place_public
  from public.profile_places
  where profile_id = a and visibility = 'public';
  select count(*) into v_place_only
  from public.profile_places
  where profile_id = a and visibility = 'only_me';
  if v_place_public < 1 then
    raise exception 'RLS_PUBLIC_PLACE=FAIL count=%', v_place_public;
  end if;
  if v_place_only <> 0 then
    raise exception 'RLS_ONLY_ME=FAIL count=%', v_place_only;
  end if;
  raise notice 'RLS_PUBLIC_PLACE=PASS';
  raise notice 'RLS_ONLY_ME=PASS';

  begin
    insert into public.profile_education (profile_id, institution, visibility)
    values (a, 'Hacked Uni', 'public');
    raise exception 'RLS_CROSS_INSERT=FAIL';
  exception
    when others then
      if sqlstate = 'P0001' and sqlerrm = 'RLS_CROSS_INSERT=FAIL' then
        raise;
      end if;
      raise notice 'RLS_CROSS_INSERT=PASS sqlstate=%', sqlstate;
  end;

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  perform public.block_ugc_user(b);
  if not public.ugc_users_are_blocked(a, b) then
    raise exception 'BLOCKED_USER_TEST=FAIL block-rpc';
  end if;

  if not exists (select 1 from public.discover_user_by_username('gateuserb')) then
    raise exception 'BLOCKED_USER_TEST=FAIL username-hidden-unexpected';
  end if;

  v_conv := public.get_or_create_direct_conversation(b);

  begin
    insert into public.messages (conversation_id, sender_id, body)
    values (v_conv, a, 'should fail');
    raise exception 'BLOCKED_USER_TEST=FAIL message-allowed';
  exception
    when others then
      if sqlstate = 'P0001' and sqlerrm = 'BLOCKED_USER_TEST=FAIL message-allowed' then
        raise;
      end if;
      raise notice 'BLOCKED_USER_TEST=PASS sqlstate=%', sqlstate;
  end;
end;
$$;

select 'MIGRATION_37_ABSENT=' || (
  select count(*)::text from supabase_migrations.schema_migrations
  where version like '%20260937%' or coalesce(name, '') like '%20260937%'
);
select 'APPLIED_35_36=' || string_agg(version, ',')
from supabase_migrations.schema_migrations
where version like '%20260935%' or version like '%20260936%';
select 'CONSTRAINT=' || c.conname
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'communication_privacy_settings'
  and c.contype = 'p';
