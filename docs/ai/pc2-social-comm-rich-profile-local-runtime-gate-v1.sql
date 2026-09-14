-- LOCAL ONLY. Disposable auth users. No hosted writes. No secrets printed.
-- Command class: docker exec supabase_db_umtuba-web psql (127.0.0.1:54322)

create extension if not exists pgcrypto;

do $$
declare
  a uuid := '11111111-1111-4111-8111-aaaaaaaaaaa1';
  b uuid := '22222222-2222-4222-8222-bbbbbbbbbbb2';
  c uuid := '33333333-3333-4333-8333-ccccccccccc3';
  v_place uuid;
  v_place_only uuid;
  v_email_before text;
  v_email_after text;
  v_count1 int;
  v_phone1 text;
  v_phone2 text;
  v_count2 int;
  v_disc_user text;
  v_conv uuid;
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

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  update public.profiles
  set bio_long = 'Local gate long bio',
      website_url = 'https://example.com/gate-a'
  where id = a;

  insert into public.profile_places (
    profile_id, place_kind, label, city, country, visibility
  ) values (a, 'current_city', 'Cairo', 'Cairo', 'Egypt', 'public')
  returning id into v_place;

  insert into public.profile_places (
    profile_id, place_kind, label, city, visibility
  ) values (a, 'hometown', 'Only me town', 'Privateville', 'only_me')
  returning id into v_place_only;

  insert into public.profile_education (
    profile_id, institution, education_type, field_of_study, visibility
  ) values (a, 'Cairo Arts', 'undergraduate', 'Film', 'public');

  if not exists (
    select 1 from public.profiles
    where id = a and bio_long = 'Local gate long bio'
      and website_url = 'https://example.com/gate-a'
  ) or v_place is null or v_place_only is null then
    raise exception 'RICH_PROFILE_RUNTIME=FAIL';
  end if;
  raise notice 'RICH_PROFILE_RUNTIME=PASS';

  insert into public.communication_privacy_settings (user_id)
  values (a)
  on conflict (user_id) do nothing;

  select find_by_email into v_email_before
  from public.communication_privacy_settings where user_id = a;

  insert into public.communication_privacy_settings (user_id, find_by_email)
  values (a, 'everyone')
  on conflict (user_id) do nothing;

  select find_by_email, count(*) over () into v_email_after, v_count1
  from public.communication_privacy_settings where user_id = a;

  select phone_e164 into v_phone1 from public.bind_own_phone('+12025550123', '+1');
  select phone_e164 into v_phone2 from public.bind_own_phone('+12025550123', '+1');
  select count(*) into v_count2 from public.communication_phone_identities where user_id = a;

  if v_count1 <> 1 or v_email_after is distinct from v_email_before
     or v_email_before <> 'nobody' or v_count2 <> 1
     or v_phone1 is distinct from v_phone2 then
    raise exception 'ON_CONFLICT_USER_ID_RUNTIME=FAIL';
  end if;
  raise notice 'ON_CONFLICT_USER_ID_RUNTIME=PASS';

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select username into v_disc_user from public.discover_user_by_username('gateusera');
  if v_disc_user is distinct from 'gateusera' then
    raise exception 'USERNAME_DISCOVERY=FAIL';
  end if;
  raise notice 'USERNAME_DISCOVERY=PASS';

  begin
    perform * from public.discover_user_by_email('gate.a@local.test');
    raise notice 'EMAIL_DISCOVERY_RPC=UNEXPECTED_SUCCESS';
  exception
    when others then
      raise notice 'EMAIL_DISCOVERY_RPC=FAIL sqlstate=% msg=%', sqlstate, sqlerrm;
  end;

  begin
    perform * from public.discover_user_by_phone('+12025550123');
    raise notice 'PHONE_DISCOVERY_RPC=UNEXPECTED_SUCCESS';
  exception
    when others then
      raise notice 'PHONE_DISCOVERY_RPC=FAIL sqlstate=% msg=%', sqlstate, sqlerrm;
  end;
end;
$$;
