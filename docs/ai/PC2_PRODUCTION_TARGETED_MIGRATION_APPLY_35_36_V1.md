# PC2 Production Targeted Migration Apply 20260935 then 20260936 V1

```text
TASK_ID = PRODUCTION_TARGETED_MIGRATION_APPLY_35_36_V1
STATUS = COMPLETE
DEVICE = PC2
DATE = 2026-09-02
BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
CANDIDATE_SHA = 3ccc164f02ccb8e54cb978bc3620d907038e64a4
MIGRATION_35_SHA256 = 4c63fa7bcee25b753e83603778c1abecc0aac836bce5ca51945c4c010c4ba6ed
MIGRATION_36_SHA256 = d1044767afcdcc2ec0622e781158cd24ebc8ecdecc962efa9e3b7cd5b3d4d8cf
PRE_APPLY_BACKUP = docs/ai/pc2-production-apply-35-36-pre-apply-snapshot.json
VAULT_SECRET_COUNT = 1
VAULT_SECRET_ID = 39abd1c2-8f9f-40fb-b704-6d95cd830e61
20260935_TRANSACTION = COMMITTED
20260936_TRANSACTION = COMMITTED
20260935_HISTORY = PRESENT_ONCE
20260936_HISTORY = PRESENT_ONCE
LIVE_VERSIONS_AFTER = 112_ROWS_TIP_20260936
20260934_REMAINS_ABSENT = YES
RICH_PROFILE_SCHEMA = PRESENT
COMMUNICATIONS_SCHEMA = PRESENT
PRIMARY_KEY_USER_ID = YES
EMAIL_RPC = NAMED_CONSTRAINT_communication_privacy_settings_pkey
PHONE_RPC_VAULT = YES_FUNCTION_SOURCE_ONLY
RLS = ENABLED_AND_FORCED
FUNCTION_PRIVILEGES = PUBLIC_REVOKED_SENSITIVE_DENIED_CLIENT_RPCS_AUTHENTICATED
ANON_DENIED = YES_PRIVACY_TABLES_AND_VAULT
PHONE_HASH_COUNT = 0
EXISTING_DATA_PRESERVED = YES
SECURITY_ADVISORS = RAN_749_WARN_22_RELATED_NO_EXTRA_FIX
PRODUCTION_SOURCE_TOUCHED = NO
DEPLOYED = NO
ORIGIN_ALPHA_PUSHED = NO
BLOCKERS = NONE
NEXT_RECOMMENDED_STEP = WAIT_FOR_SEPARATE_OWNER_GO_SOURCE_MERGE_OR_DEPLOY
```

Isolated worktree only. Dirty primary checkout was **not** reset. No `db push`. No `--linked` apply of the whole chain. `20260934` and `20260937` were not applied. No phone-hash create. No source merge or deploy. `.env` not printed. `vault.decrypted_secrets` was not selected.

---

## Authoritative source

HEAD of the isolated worktree was already `3ccc164f02ccb8e54cb978bc3620d907038e64a4`.

| File | Git blob | SHA256 of blob bytes | Bytes |
| --- | --- | --- | --- |
| `20260935_rich_personal_profile_foundation_v1.sql` | `ff136ad7b0b7156e73a75caf5f7816901ba5c323` | `4c63fa7bcee25b753e83603778c1abecc0aac836bce5ca51945c4c010c4ba6ed` | 25331 |
| `20260936_communications_identity_discovery_v1.sql` | `06f631bca75832a06c643fbdecddefb2f414ef91` | `d1044767afcdcc2ec0622e781158cd24ebc8ecdecc962efa9e3b7cd5b3d4d8cf` | 27444 |

Apply wrappers were built from `git cat-file blob` of those commits, not from a dirty working-tree copy. Inner-file SHA256 was re-checked after wrap.

---

## Pre-apply gates

Live `supabase_migrations.schema_migrations` columns: `version text NOT NULL`, `statements ARRAY NULL`, `name text NULL`.

| Check | Result |
| --- | --- |
| LIVE_TIP | `20260933` |
| Row count | 110 |
| `20260934` | ABSENT |
| `20260935` | ABSENT |
| `20260936` | ABSENT |
| Vault name `communications_identity_pepper` count | 1 |
| Vault id | `39abd1c2-8f9f-40fb-b704-6d95cd830e61` |
| Decrypted secret queried | NO |

Pre-apply snapshot: `docs/ai/pc2-production-apply-35-36-pre-apply-snapshot.json`.

Before apply:

- `public.profiles` count = 25
- profiles columns = original 11 (`id` … `updated_at`); no `bio_long` / `cover_url` / `website_url`
- all rich-profile and communication tables absent
- `learning_teacher_profiles` absent
- phone-hash table absent (treated as count 0)

---

## Execution

Hosted path: `npx supabase db query --linked --project-ref` with one explicit file per transaction. Not `db push`.

Each file was sent as a single query batch:

```sql
BEGIN;
-- exact 3ccc164f blob
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES (...);
-- in-transaction basic verify (RAISE EXCEPTION on miss)
COMMIT;
```

Management API `/database/query` accepts one `query` string per request. The wrapper is one file / one request so file + history insert stay together. If the in-tx verify raised, COMMIT would not run.

| Step | Result |
| --- | --- |
| Apply 20260935 | CLI exit 0 |
| Mid-check after 35 | tip `20260935`, 111 rows, name `rich_personal_profile_foundation_v1`, 34 still absent, profiles still 25 |
| Apply 20260936 | CLI exit 0 |

---

## Post-apply verification (read-only)

| Check | Result |
| --- | --- |
| `20260935` history | 1 row, name `rich_personal_profile_foundation_v1` |
| `20260936` history | 1 row, name `communications_identity_discovery_v1` |
| Live tip | `20260936` |
| Total versions | 112 |
| `20260934` | still ABSENT |
| Learning teacher objects | still ABSENT |
| profiles count | 25 (unchanged) |
| New profile columns | `bio_long`, `cover_url`, `website_url` added; original columns kept |
| Rich profile tables | `profile_places`, `education`, `work`, `tags`, `milestones`, `links` exist; all counts 0 |
| `profile-covers` bucket | exists |
| Communication tables | exist; privacy 0, phone identities 0, contact sync 0 |
| `communication_privacy_settings_pkey` | PRIMARY KEY on `user_id` |
| RLS on privacy settings | enabled + forced |
| `discover_user_by_email` | uses `on constraint communication_privacy_settings_pkey`; not `on conflict (user_id)` |
| Phone / digest Vault | function source contains `vault.decrypted_secrets` and name `communications_identity_pepper` (no decrypted SELECT) |
| PUBLIC EXECUTE | revoked on listed comms functions |
| Sensitive internals | `comms_identity_digest` EXECUTE false for public/anon/authenticated/service_role |
| Client RPCs | EXECUTE granted to `authenticated` as the file intends |
| Anon table access | no SELECT/INSERT/UPDATE/DELETE on communication privacy/phone/contact-sync or `vault.secrets` / `vault.decrypted_secrets` |
| Phone hash count | 0 |

Recorded (not fixed): platform default still leaves EXECUTE on several client SECURITY DEFINER RPCs for `anon`. Advisors report that as WARN. Sensitive internals are not included.

---

## Security Advisors

Command: `npx supabase db advisors --linked --project-ref --type security --fail-on none`.

```text
ADVISORS_RAN = YES
TOTAL_FINDINGS = 749
ERROR = 0
WARN = 749
INFO = 0
RELATED_TO_35_36 = 22
RELATED_BREAKDOWN = 11 anon_security_definer_function_executable + 11 authenticated_security_definer_function_executable
EXTRA_FIXES_APPLIED = NO
```

The 11 authenticated WARNs match the intended GRANT TO authenticated. The 11 anon WARNs match leftover default EXECUTE on those same client RPCs. No advisor ERROR. No extra privilege rewrite in this GO.

---

## What was not done

- No `db push`
- No apply of `20260934` or `20260937`
- No Vault secret value read or rotate
- No phone-hash / fake user create
- No source merge, deploy, or `origin/alpha-0.2` push
- Primary dirty checkout not reset

## STOP

Apply + verify is complete. Wait for a separate owner GO before source merge or deploy.
