-- Live Streaming V2 — add live_participants to Realtime publication
-- (rooms + chat already published in V1 foundation)

do $$
begin
  begin
    alter publication supabase_realtime add table public.live_participants;
  exception
    when duplicate_object then null;
  end;
end;
$$;
