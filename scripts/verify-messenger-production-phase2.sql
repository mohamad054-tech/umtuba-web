-- Verify Messenger Production Phase 2 objects after applying:
--   supabase/migrations/20260729_messenger_production_phase2.sql
--
-- Run in Supabase SQL Editor. Expected: every ok column is true.
-- Safe / read-only: no writes, no drops, no data mutation.

select check_name, ok from (
  select 'message_reactions_table' as check_name,
    to_regclass('public.message_reactions') is not null as ok
  union all
  select 'message_hides_table',
    to_regclass('public.message_hides') is not null
  union all
  select 'muted_until_column',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'conversation_participants'
        and column_name = 'muted_until'
    )
  union all
  select 'edit_own_text_message_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'edit_own_text_message'
        and pg_get_function_identity_arguments(p.oid) = 'p_message_id uuid, p_body text'
    )
  union all
  select 'soft_delete_for_everyone_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'soft_delete_message_for_everyone'
        and pg_get_function_identity_arguments(p.oid) = 'p_message_id uuid'
    )
  union all
  select 'hide_message_for_me_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'hide_message_for_me'
        and pg_get_function_identity_arguments(p.oid) = 'p_message_id uuid'
    )
  union all
  select 'toggle_message_reaction_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'toggle_message_reaction'
        and pg_get_function_identity_arguments(p.oid) = 'p_message_id uuid, p_emoji text'
    )
  union all
  select 'list_message_reactions_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'list_message_reactions'
        and pg_get_function_identity_arguments(p.oid) = 'p_conversation_id uuid, p_message_ids uuid[]'
    )
  union all
  select 'set_conversation_mute_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'set_conversation_mute'
        and pg_get_function_identity_arguments(p.oid) = 'p_conversation_id uuid, p_mute_option text'
    )
  union all
  select 'is_conversation_muted_for_user_rpc',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_conversation_muted_for_user'
    )
  union all
  select 'list_conversation_peers_has_last_read_at',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'list_conversation_peers'
        and pg_get_function_result(p.oid) ilike '%last_read_at%'
    )
  union all
  select 'edit_rpc_authenticated_execute',
    has_function_privilege(
      'authenticated',
      'public.edit_own_text_message(uuid, text)',
      'execute'
    )
  union all
  select 'edit_rpc_no_anon_execute',
    not has_function_privilege(
      'anon',
      'public.edit_own_text_message(uuid, text)',
      'execute'
    )
  union all
  select 'reaction_rpc_authenticated_execute',
    has_function_privilege(
      'authenticated',
      'public.toggle_message_reaction(uuid, text)',
      'execute'
    )
  union all
  select 'mute_rpc_authenticated_execute',
    has_function_privilege(
      'authenticated',
      'public.set_conversation_mute(uuid, text)',
      'execute'
    )
  union all
  select 'notify_skips_muted_participants',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'notify_on_direct_message'
        and pg_get_functiondef(p.oid) ilike '%is_muted%'
        and pg_get_functiondef(p.oid) ilike '%muted_until%'
    )
  union all
  select 'list_messages_filters_hides',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'list_conversation_messages'
        and pg_get_functiondef(p.oid) ilike '%message_hides%'
    )
  union all
  select 'realtime_messages_published',
    exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    )
  union all
  select 'realtime_message_reactions_published',
    exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'message_reactions'
    )
  union all
  select 'realtime_conversation_participants_published',
    exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversation_participants'
    )
  union all
  select 'message_reactions_rls_enabled',
    coalesce(
      (select relrowsecurity from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'message_reactions'),
      false
    )
  union all
  select 'message_hides_rls_enabled',
    coalesce(
      (select relrowsecurity from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'message_hides'),
      false
    )
) checks
order by check_name;
