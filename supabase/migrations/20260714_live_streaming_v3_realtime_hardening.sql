-- Live Streaming V3 — production realtime hardening (idempotent)
-- Ensures chat, rooms, participants, and reactions are in the Realtime publication.
-- Safe to re-run. No schema changes beyond publication membership.

do $$
begin
  begin
    alter publication supabase_realtime add table public.live_chat_messages;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_rooms;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_participants;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_reactions;
  exception
    when duplicate_object then null;
  end;
end;
$$;

-- Optional: confirm RLS still allows authenticated participants to read reactions
-- (policy "View reactions in visible live rooms" from V1 foundation).
