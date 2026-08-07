# CURSOR_REPORT — Collaboration Workspace Resource Link Mutation Runtime V1

## Summary

**CLOSED** — Authenticated mutation runtime for workspace resource links via
SECURITY DEFINER RPCs (local migration `20260919`). Table grants remain
SELECT-only. No remote apply. No product bindings. Platform flag default `false`.
Not merged to Collaboration SoT.

## Exact files changed

- `supabase/migrations/20260919_collaboration_workspace_resource_link_mutation_runtime_v1.sql` (new, local only)
- `lib/collaboration/workspaceResourceLinkMutationRuntime.ts` (new)
- `lib/collaboration/workspaceResourceLinkMutationRuntime.test.ts` (new)
- `lib/collaboration/workspaceSpineFoundation.ts` (RPC name exports)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

YES — `20260919_collaboration_workspace_resource_link_mutation_runtime_v1.sql` (NOT applied)

## Security review

- No direct authenticated INSERT/UPDATE/DELETE grants
- SECURITY DEFINER RPCs with `search_path = public`, `auth.uid()` required
- Authorization via `can_manage_collaboration_workspace` (owner/admin/platform admin)
- Unique `(resource_type, resource_id)` conflict mapped explicitly
- Error sanitization for auth/permission/duplicate/not-found
- No service-role in user-facing runtime
- No Learning/Commerce/advertiser binding

## Tests

- mutation runtime — 10/10 PASS
- resource link foundation — 11/11 PASS
- platform gate — 7/7 PASS
- spine foundation — 12/12 PASS
- Total focused: 40/40 PASS

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Not required (lib + migration only).

## git diff --check

PASS

## git status --short

Clean after commit/push (see closeout).

## Open issues

- Migration `20260919` not applied remotely
- Product bindings deferred
- No UI / SoT integration in this milestone
