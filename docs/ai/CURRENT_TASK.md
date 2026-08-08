# Current Task

## COLLABORATION SoT — Learning Link/Unlink Credentialed E2E Smoke V1

- **Milestone:** `COLLABORATION_WORKSPACE_LEARNING_RESOURCE_LINK_UNLINK_CREDENTIALED_E2E_SMOKE_V1`
- **SoT branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Starting HEAD:** `4254afa233ac51863be58c44c5bfb0219cb235ab`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Status

**BLOCKED** — credentialed environment prerequisites absent.

### Missing prerequisites (exact)

1. SoT has no approved credentialed Collaboration E2E harness for Learning link/unlink
   (ops fork readiness-only is NOT SoT; credentialed runs remain deferred there)
2. `COLLABORATION_E2E` unset
3. `PLAYWRIGHT_BASE_URL` unset
4. `COLLABORATION_E2E_OWNER_EMAIL` / `COLLABORATION_E2E_OWNER_PASSWORD` unset
5. `COLLABORATION_E2E_PEER_EMAIL` / `COLLABORATION_E2E_PEER_PASSWORD` unset
6. `scripts/collaboration-e2e/config.local.sql` absent (dedicated Auth UUIDs)
7. SoT worktree has no local Supabase public env (`.env.local` absent)

Did **not** fabricate credentials, weaken auth/RLS, or use service-role to fake user path.
Did **not** start Commerce/advertiser binding.

## Non-credentialed evidence retained

- Platform gate + Learning binding + UI wiring unit tests: PASS (34/34 focused)

## Do NOT start automatically

- Commerce / advertiser bindings
- Platform flag enablement in production
- Fabricating smoke identities
