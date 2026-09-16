-- APPLIED TO PRODUCTION 2026-09-16

delete from public.platform_admins
where note like 'UMTUBA_E2E_%';
create or replace function public.guard_profile_moderation_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.moderation_status is distinct from old.moderation_status
     and current_user in ('authenticated', 'anon') then
    raise exception 'moderation_status_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_moderation_status_trg on public.profiles;
create trigger guard_profile_moderation_status_trg
before update on public.profiles
for each row execute function public.guard_profile_moderation_status();
