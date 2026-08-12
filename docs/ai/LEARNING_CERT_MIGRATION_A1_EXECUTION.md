# A1 — CERTIFICATION MIGRATION EXECUTION

Task: `LEARNING_CERTIFICATION_MIGRATION_FINAL_EXECUTION_AND_CLOSEOUT_V1`  
Date: 2026-08-12 · Device: LAPTOP

## Authoritative context

| Item | Value |
| --- | --- |
| Learning tip | `office/learning-ai-tutor-learner-ui-integration-v1` @ `91910c2` |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1` |
| Linked probe worktree | Collab SoT (has `supabase link`) `...\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |
| Learning tip link | NOT linked (`LegacyProjectNotLinkedError`) — probes used Collab linked project (same remote DB) |

## Discovery (re-verified live)

1. Prior inventory claimed “NO FILE / Central must apply”.
2. Live `schema_migrations` contains:
   - **version=`20260921`**
   - **name=`learning_certification_persistence_v1`**
3. `migration list --linked`: `local=""` / `remote="20260921"` (remote-only; **no local SQL on Laptop git**).
4. Objects present on target DB:
   - Tables: `learning_certificates`, `learning_certificate_events` (FORCE RLS on both)
   - RPCs: `issue_certificate`, `verify_certificate`, `revoke_certificate`, `get_my_learning_certificates`, `learning_certificate_event_append`, …
   - Constraints: PK, UNIQUE `(user_id, course_id)`, status ∈ {issued,revoked}, verification_token, revoke fields, idempotency_key
   - RLS policies (read): Learners / Managers / Platform admins
5. Row counts (smoke): certificates=0, events=0 (empty store; schema ready)

## PRE state

- Stale docs: `PERSISTENCE_EXISTS=NO`, `MIGRATION_REQUIRED=YES`, WAITING Central apply
- Actual DB: already applied + registered

## Execution result

**No Laptop apply performed** — migration already APPLIED on production target by Central.

Re-applying would be unsafe/idempotency-risk without exact SQL and would violate “apply only intended missing migration”.

## POST state

| Check | Result |
| --- | --- |
| APPLIED | YES (`20260921`) |
| REGISTERED/HISTORY | YES (`supabase_migrations.schema_migrations`) |
| Schema/RPC/RLS | YES (probed) |
| Pending cert migrations | NONE found by name |
| Local SQL drift | YES — file missing from Learning tip git |

## Laptop code closeout

Updated Learning tip readiness contract to match live evidence:

- `lib/learning/certificationPersistenceMigrationReadiness.ts`
- `lib/learning/certificationPersistenceMigrationReadiness.test.ts`

## Metrics

```
CERTIFICATION_MIGRATION_APPLIED = YES
CERTIFICATION_MIGRATION_HISTORY_VERIFIED = YES
CENTRAL_ACTION_REQUIRED = SYNC_GIT_FILE_20260921_learning_certification_persistence_v1_INTO_LEARNING_SOT (optional SoT reconcile; DB already applied)
```
