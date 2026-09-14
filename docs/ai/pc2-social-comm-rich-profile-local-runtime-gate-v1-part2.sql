-- LOCAL ONLY. Same transaction so jwt GUCs survive. No hosted writes.
do $$
declare
  a uuid := '11111111-1111-4111-8111-aaaaaaaaaaa1';
  b uuid := '22222222-2222-4222-8222-bbbbbbbbbbb2';
  v_public int;
  v_only int;
  v_priv int;
  v_conv uuid;
  v_phone_hit text;
begin
  if not exists (select 1 from auth.users where id = a) then
    raise exception 'LOCAL_USERS_MISSING';
  end if;

  -- Phone RPC hits ON CONFLICT only after a verified match exists
  update public.communication_privacy_settings
  set find_by_phone = 'everyone' where user_id = a;
  update public.communication_phone_identities
  set phone_verified_at = now() where user_id = a;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    perform * from public.discover_user_by_phone('+12025550123');
    raise notice 'PHONE_DISCOVERY_VERIFIED_RPC=UNEXPECTED_SUCCESS';
  exception
    when others then
      raise notice 'PHONE_DISCOVERY_VERIFIED_RPC=FAIL sqlstate=% msg=%', sqlstate, sqlerrm;
  end;

  -- RLS as B
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_public
  from public.profile_places
  where profile_id = a and visibility = 'public';
  select count(*) into v_only
  from public.profile_places
  where profile_id = a and visibility = 'only_me';
  select count(*) into v_priv
  from public.communication_privacy_settings
  where user_id = a;

  if v_public = 1 then
    raise notice 'RLS_PUBLIC_PLACE=PASS';
  else
    raise notice 'RLS_PUBLIC_PLACE=FAIL count=%', v_public;
  end if;
  if v_only = 0 then
    raise notice 'RLS_ONLY_ME=PASS';
  else
    raise notice 'RLS_ONLY_ME=FAIL count=%', v_only;
  end if;
  if v_priv = 0 then
    raise notice 'RLS_PRIVACY_CROSS=PASS';
  else
    raise notice 'RLS_PRIVACY_CROSS=FAIL count=%', v_priv;
  end if;

  begin
    insert into public.profile_education (profile_id, institution, visibility)
    values (a, 'Hacked Uni', 'public');
    raise notice 'RLS_CROSS_INSERT=FAIL';
  exception
    when others then
      raise notice 'RLS_CROSS_INSERT=PASS sqlstate=%', sqlstate;
  end;

  -- Back to postgres for block seed if needed, then A jwt
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  perform public.block_ugc_user(b);
  if public.ugc_users_are_blocked(a, b) then
    raise notice 'BLOCK_RPC=PASS';
  else
    raise notice 'BLOCK_RPC=FAIL';
  end if;

  if exists (select 1 from public.discover_user_by_username('gateuserb')) then
    raise notice 'DISCOVERY_AFTER_BLOCK=STILL_VISIBLE_EXPECTED';
  else
    raise notice 'DISCOVERY_AFTER_BLOCK=UNEXPECTED';
  end if;

  v_conv := public.get_or_create_direct_conversation(b);
  raise notice 'DM_CREATE_AFTER_BLOCK=CREATED';

  begin
    insert into public.messages (conversation_id, sender_id, body)
    values (v_conv, a, 'should fail');
    raise notice 'BLOCKED_MESSAGE=FAIL';
  exception
    when others then
      raise notice 'BLOCKED_MESSAGE=PASS sqlstate=% msg=%', sqlstate, sqlerrm;
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
