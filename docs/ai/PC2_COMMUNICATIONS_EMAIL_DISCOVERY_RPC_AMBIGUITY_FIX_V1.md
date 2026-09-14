# PC2 Communications email discovery RPC ambiguity fix V1

```text
TASK_ID = PC2_COMMUNICATIONS_EMAIL_DISCOVERY_RPC_AMBIGUITY_FIX_V1
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
PARENT_CANDIDATE_SHA = 9d59302e2eacfd5a3fe861fe6a66b4cd9fb934fa
FIX_SHA = 4eb8e91aff6310d243547790d867690663a6827d
EXACT_CONSTRAINT_NAME = communication_privacy_settings_pkey
PRODUCTION_DB_TOUCHED = NO
ORIGIN_ALPHA_PUSHED = NO
DEPLOYED = NO
```

## Root cause

`discover_user_by_email` is `RETURNS TABLE (user_id uuid, …)` and did:

```sql
insert into public.communication_privacy_settings (user_id)
values (v_target)
on conflict (user_id) do nothing;
```

Inside PL/pgSQL, `user_id` is also an output column, so Postgres raises `column reference "user_id" is ambiguous`. Confirmed on the previous local runtime gate against `9d59302e`.

## Catalog evidence (not guessed)

Queried local catalogs on `supabase_db_umtuba-web`:

| Field | Value |
| --- | --- |
| table | `public.communication_privacy_settings` |
| constraint | `communication_privacy_settings_pkey` |
| type | `p` (primary key) |
| definition | `PRIMARY KEY (user_id)` |
| unique index | `CREATE UNIQUE INDEX communication_privacy_settings_pkey … (user_id)` |

## Approved fix

```sql
on conflict on constraint communication_privacy_settings_pkey do nothing;
```

Only inside `discover_user_by_email` in `20260936`. Other `ON CONFLICT (user_id)` sites left unchanged.

## Local apply method

- Reused already-running local Supabase (`project_id=umtuba-web`, API `127.0.0.1:54321`, DB `127.0.0.1:54322`). Not linked.
- Did **not** `db reset --local` (fails at `20260712` / missing `public.posts`; out of scope).
- `20260936` already listed in `supabase_migrations.schema_migrations`.
- Edited the migration file, then replaced only the function on local (`CREATE OR REPLACE` in `pc2-communications-email-discovery-rpc-ambiguity-fix-v1.sql`) so the file remains the source of truth.
- Did not rewrite `20260935`. Did not invent `20260937`. Did not edit `20260712`.

## Local results

| Field | Result |
| --- | --- |
| EMAIL_EXISTING_USER | PASS |
| EMAIL_NOT_FOUND | PASS |
| EMAIL_PRIVACY | PASS |
| DUPLICATE_CALL | PASS |
| ON_CONFLICT_AMBIGUITY | PASS |
| RLS_TESTS | PASS |
| BLOCKED_USER_TEST | PASS |
| TYPECHECK | PASS |
| TESTS | PASS (9/9 communicationsDiscovery.v1) |
| WEB_BUILD | PASS |

## Production

STOP. Separate GO required to apply `20260935` / `20260936` on hosted.
