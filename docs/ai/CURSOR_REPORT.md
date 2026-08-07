# CURSOR_REPORT — Resource Link Mutation Runtime remote apply V1

## Summary

**CLOSED** — Targeted remote apply of `20260919` to linked UMTUBA project.
Three SECURITY DEFINER mutation RPCs verified. Authenticated table grants remain
SELECT-only. Platform flag default `false`. Not merged to Collaboration SoT.

## Apply method

1. Preflight: project `umtuba` / `tgucwnjwoyeqoxqaxmew` linked; `20260919` absent remotely; target RPCs absent; FORCE RLS + SELECT-only confirmed.
2. Apply SQL: `npx supabase db query --linked -f supabase/migrations/20260919_collaboration_workspace_resource_link_mutation_runtime_v1.sql`
3. Register history (target-only): `npx supabase migration repair --linked --status applied 20260919`
4. No `db push`. No unrelated versions repaired/applied.

## Remote verification

- History: `20260919` / `collaboration_workspace_resource_link_mutation_runtime_v1` registered once; max version `20260919`
- RPCs: create / update / delete exist; SECURITY DEFINER; `search_path=public`
- EXECUTE: authenticated + service_role; anon denied
- Table: FORCE RLS still true; authenticated SELECT-only (no INSERT/UPDATE/DELETE)

## Exact files changed (docs closeout)

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None in this milestone (apply-only).

## Migrations applied

YES — `20260919` only.

## Security review

- No direct authenticated table writes enabled
- Authorization remains via `can_manage_collaboration_workspace`
- No product bindings
- No platform flag change

## Tests

Focused 40/40 PASS; `tsc --noEmit` PASS

## Open issues

- SoT integration of mutation runtime branch
- Product bindings deferred
