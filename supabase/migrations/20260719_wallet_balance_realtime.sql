-- Enable realtime balance updates for the header wallet pill.
-- Additive / idempotent. Apply after notifications V2 automation.

do $$
begin
  begin
    alter publication supabase_realtime add table public.um_point_balances;
  exception
    when duplicate_object then null;
  end;
end;
$$;

alter table public.um_point_balances replica identity full;
