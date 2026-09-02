-- LOCAL ONLY. Disposable auth users + disposable Vault name check.
-- Never prints a secret value. Never writes hosted. Never commits a pepper.
-- Command class: docker exec supabase_db_umtuba-web psql (127.0.0.1:54322)

create extension if not exists pgcrypto;

do $$
declare
  a uuid := '11111111-1111-4111-8111-aaaaaaaaaaa1';
  b uuid := '22222222-2222-4222-8222-bbbbbbbbbbb2';
  c uuid := '33333333-3333-4333-8333-ccccccccccc3';
  v_secret_id uuid;
  v_phone1 text;
  v_phone2 text;
  v_hash_len int;
  v_hash_count int;
  v_row_count int;
  v_disc_user text;
  v_email_user text;
  v_anon_vault int;
  v_anon_rpc_ok boolean := false;
  v_unauth_ok boolean := false;
  v_missing_ok boolean := false;
  v_secret_in_notices boolean := false;
begin
  delete from auth.users where id in (a, b, c);

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'vault.a@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"vaultusera","full_name":"Vault User A"}'::jsonb, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'vault.b@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"vaultuserb","full_name":"Vault User B"}'::jsonb, now(), now()),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'vault.c@local.test', crypt('local-only', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"vaultuserc","full_name":"Vault User C"}'::jsonb, now(), now());

  insert into public.profiles (id, full_name, username, display_name, avatar_initial)
  values
    (a, 'Vault User A', 'vaultusera', 'Vault A', 'V'),
    (b, 'Vault User B', 'vaultuserb', 'Vault B', 'V'),
    (c, 'Vault User C', 'vaultuserc', 'Vault C', 'V')
  on conflict (id) do update
    set username = excluded.username, display_name = excluded.display_name;

  -- LOCAL disposable secret. Value never selected, never raised, never noticed.
  delete from vault.secrets where name = 'communications_identity_pepper';
  v_secret_id := vault.create_secret(
    encode(gen_random_bytes(32), 'hex'),
    'communications_identity_pepper',
    'local-test-only-delete-after-gate'
  );
  if v_secret_id is null then
    raise exception 'LOCAL_VAULT_CREATE=FAIL';
  end if;
  raise notice 'LOCAL_VAULT_PRESENT=YES';

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  select phone_e164 into v_phone1 from public.bind_own_phone('+12025550123', '+1');
  select phone_e164 into v_phone2 from public.bind_own_phone('+12025550123', '+1');
  select count(*), max(char_length(phone_e164_hash))
    into v_row_count, v_hash_len
  from public.communication_phone_identities
  where user_id = a;

  if v_phone1 is distinct from '+12025550123'
     or v_phone1 is distinct from v_phone2
     or v_row_count <> 1
     or v_hash_len <> 64 then
    raise exception 'LOCAL_PHONE_HASH=FAIL';
  end if;
  raise notice 'LOCAL_PHONE_HASH=PASS';
  raise notice 'LOCAL_RETRY_NO_DUPLICATE=PASS';

  perform set_config('app.comms_allow_phone_verify', 'on', true);
  update public.communication_phone_identities
    set phone_verified_at = now()
    where user_id = a;
  perform set_config('app.comms_allow_phone_verify', '', true);

  insert into public.communication_privacy_settings (user_id, find_by_phone, find_by_email)
  values (a, 'everyone', 'everyone')
  on conflict (user_id) do update
    set find_by_phone = 'everyone', find_by_email = 'everyone';

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select username into v_disc_user from public.discover_user_by_phone('+12025550123');
  if v_disc_user is distinct from 'vaultusera' then
    raise exception 'LOCAL_PHONE_DISCOVERY=FAIL';
  end if;
  raise notice 'LOCAL_PHONE_DISCOVERY=PASS';

  select username into v_email_user from public.discover_user_by_email('vault.a@local.test');
  if v_email_user is distinct from 'vaultusera' then
    raise exception 'LOCAL_EMAIL_DISCOVERY=FAIL';
  end if;
  raise notice 'LOCAL_EMAIL_DISCOVERY=PASS';

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.block_ugc_user(b);

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  v_disc_user := null;
  select username into v_disc_user from public.discover_user_by_phone('+12025550123');
  if v_disc_user is not null then
    raise exception 'BLOCKED_USER_TEST=FAIL';
  end if;
  raise notice 'BLOCKED_USER_TEST=PASS';

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  begin
    perform * from public.discover_user_by_phone('+12025550123');
    v_unauth_ok := true;
  exception
    when others then
      if sqlerrm not ilike '%Authentication required%' then
        raise exception 'UNAUTH_TEST=FAIL sqlstate=%', sqlstate;
      end if;
  end;
  if v_unauth_ok then
    raise exception 'UNAUTH_TEST=FAIL';
  end if;
  raise notice 'UNAUTH_TEST=PASS';

  perform set_config('role', 'anon', true);
  begin
    execute 'select count(*) from vault.decrypted_secrets' into v_anon_vault;
    raise notice 'ANON_VAULT_READ=FAIL count_returned';
  exception
    when others then
      raise notice 'ANON_VAULT_READ=PASS';
  end;
  begin
    perform * from public.discover_user_by_phone('+12025550123');
    v_anon_rpc_ok := true;
  exception
    when others then
      raise notice 'ANON_RPC=PASS';
  end;
  if v_anon_rpc_ok then
    raise exception 'ANON_RPC=FAIL';
  end if;
  perform set_config('role', 'postgres', true);
  raise notice 'ANON_TEST=PASS';

  -- Fail-closed when the named secret is missing. Create no new hash.
  delete from vault.secrets where name = 'communications_identity_pepper';
  perform set_config('request.jwt.claim.sub', c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into v_hash_count from public.communication_phone_identities where user_id = c;
  begin
    perform * from public.bind_own_phone('+14445550123', '+1');
    v_missing_ok := true;
  exception
    when others then
      if position('pepper' in lower(sqlerrm)) = 0 then
        raise exception 'MISSING_SECRET_FAIL_CLOSED=FAIL sqlstate=%', sqlstate;
      end if;
      if position('communications_identity_pepper' in sqlerrm) > 0
         and sqlerrm ~ '[0-9a-f]{16,}' then
        v_secret_in_notices := true;
      end if;
  end;
  if v_missing_ok then
    raise exception 'MISSING_SECRET_FAIL_CLOSED=FAIL';
  end if;
  if exists (select 1 from public.communication_phone_identities where user_id = c)
     or v_hash_count <> 0 then
    raise exception 'MISSING_SECRET_CREATED_HASH=FAIL';
  end if;
  if v_secret_in_notices then
    raise exception 'SECRET_EXPOSED=YES';
  end if;
  raise notice 'MISSING_SECRET_FAIL_CLOSED=PASS';
  raise notice 'SECRET_EXPOSED=NO';

  delete from auth.users where id in (a, b, c);
end;
$$;
