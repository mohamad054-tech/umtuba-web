# PC2 Social + Communications + Rich Profile — local migration runtime gate V1

```text
TASK_ID = PC2_SOCIAL_COMM_RICH_PROFILE_LOCAL_MIGRATION_RUNTIME_GATE_V1
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
CANDIDATE_SHA = 9d59302e2eacfd5a3fe861fe6a66b4cd9fb934fa
EVIDENCE_COMMAND_CLASS = local Docker psql / npx supabase --local only
20260937_EXCLUDED = YES
PRODUCTION_DB_TOUCHED = NO
ORIGIN_ALPHA_PUSHED = NO
DEPLOYED = NO
```

## Before apply

- Read `PROJECT_STATE.md`, `CURRENT_TASK.md`, `docs/DEVELOPMENT_WORKFLOW.md`, isolated `CURSOR_REPORT.md`.
- Files present:
  - `supabase/migrations/20260935_rich_personal_profile_foundation_v1.sql`
  - `supabase/migrations/20260936_communications_identity_discovery_v1.sql`
- `ON CONFLICT (user_id)`: **6 sites in 20260936**. 20260935 has `ON CONFLICT (id)` for `profile-covers` bucket only.
- Order on branch: `… 20260934` then `20260935` then `20260936`. **No `20260937`.**
- UM Streak worktree not opened for writes.

## Local stack

- Docker Engine up. Containers `supabase_*_umtuba-web` healthy (API `127.0.0.1:54321`, DB `127.0.0.1:54322`).
- `npx supabase status`: `linked_project: null`. Not `--linked`.
- Shared `project_id = umtuba-web` also appears in the UM Streak config file; that worktree was not used. After this gate, local history has **no** `20260937`.

## Rebuild

1. `npx supabase db reset --local --yes --no-seed` → **FAIL**
   - `20260712_auth_profiles_posts_rls.sql` statement 12: `relation "public.posts" does not exist`.
   - Recreate wiped the previous local DB (it had `20260934` + leftover `20260937`, not 35/36).
2. One-shot local precursor (not added to this branch):
   `umtuba-web-translation-trunk-port-v1/supabase/migrations/20260711_local_bootstrap_posts_table_precursor_v1.sql`
3. Sequential `psql` apply of this branch’s migrations (118 files). Log: `docs/ai/_pc2_local_migration_replay_v1.log`
   - PASS 116 / FAIL 2 (old live-media host-stage; ads admin before ads platform).
   - PASS `20260935` then PASS `20260936`.
   - SKIP/absent `20260937`.

`FULL_REBUILD_FROM_ZERO = PARTIAL` — official reset failed; disposable DB was wiped then replayed locally without 37.

## Runtime scripts

- `docs/ai/pc2-social-comm-rich-profile-local-runtime-gate-v1.sql`
- `docs/ai/pc2-social-comm-rich-profile-local-runtime-gate-v1-part2.sql`

Local users only (`gateusera`, `gateuserb`, `gateuserc`). No production users. No secrets in output.

## Results

| Field | Value |
| --- | --- |
| LOCAL_SUPABASE_STARTED | YES |
| CLEAN_DATABASE_USED | YES (reset emptied; replayed) |
| 20260935_APPLIED_LOCAL | YES |
| 20260936_APPLIED_LOCAL | YES |
| MIGRATION_ORDER | 35 then 36; 37 excluded |
| FULL_REBUILD_FROM_ZERO | PARTIAL |
| RICH_PROFILE_RUNTIME | PASS |
| COMMUNICATIONS_DISCOVERY_RUNTIME | PARTIAL (username PASS; email RPC FAIL ambiguous `user_id`) |
| ON_CONFLICT_USER_ID_RUNTIME | PASS (raw insert retry) |
| RLS_TESTS | PASS |
| BLOCKED_USER_TEST | PASS (message send rejected; discovery/DM create not hooked in 36) |
| TYPECHECK | PASS |
| TESTS | 57/58 (pre-existing shellCoherence) |
| WEB_BUILD | PASS |

## Production

STOP. Separate GO required to apply `20260935` / `20260936` on hosted. Do not ship 36 until the email RPC `ON CONFLICT (user_id)` ambiguity is decided.
