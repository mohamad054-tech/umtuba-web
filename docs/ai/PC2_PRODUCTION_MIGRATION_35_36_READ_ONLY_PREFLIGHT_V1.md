# PC2 — Production migration 35/36 read-only preflight V1

```text
TASK_ID = PRODUCTION_MIGRATION_35_36_READ_ONLY_PREFLIGHT_V1
STATUS = READ_ONLY_PREFLIGHT_COMPLETE
DEVICE = PC2
DATE = 2026-09-02
CANDIDATE_SHA_REVIEWED = 4eb8e91aff6310d243547790d867690663a6827d
AUTHORITATIVE_BASE_REF = origin/alpha-0.2
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
BASE_MOVED = NO
SQL_APPLIED = NO
DB_PUSH = NO
MIGRATION_UP = NO
PRODUCTION_CHANGED = NO
PLAN_EXECUTED = NO
```

Isolated worktree: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1`  
Branch: `pc2/social-comm-rich-profile-renumber-integrate-v1` @ `4eb8e91a`  
Dirty primary checkout was **not** reset.

Command class (SELECT only): `npx supabase db query --linked --project-ref <hosted-umtuba-ref>`  
CLI: `2.116.0`. `--linked` required. No `--db-url`. No secrets printed.

---

## 1. What candidate `4eb8e91a` would ship vs `origin/alpha-0.2`

Four commits (`b5fbeff2` → `4eb8e91a`), **68 files**, `+9866 / -264`:

| SHA | Purpose |
| --- | --- |
| `81422677` | Integrate UM Life, communications, and rich profile onto Central |
| `75b3896c` | Keep UM Life distinct from Home on welcome nav |
| `9d59302e` | Ship social comms + rich profile as **`20260935` / `20260936`** |
| `4eb8e91a` | Email discovery RPC: `ON CONFLICT ON CONSTRAINT communication_privacy_settings_pkey` |

Product surfaces (source, not applied here):

- Rich profile: Settings editor, About / Who, `/u/[username]`, 13-locale copy
- Communications: discovery RPCs, privacy panel, start-conversation, QR, Messages wiring
- Nav: UM Life entry distinct from Home

**Migrations that are new vs alpha:** only

- `supabase/migrations/20260935_rich_personal_profile_foundation_v1.sql`
- `supabase/migrations/20260936_communications_identity_discovery_v1.sql`

`20260934` is **already on alpha**. It is not part of this candidate delta.

### 20260935 contents (SHA256 `A0826222…` — same body as the old 15)

Additive rich-profile foundation. Does **not** replace `public.profiles`.

Creates / alters:

- Function `public.can_read_profile_audience(uuid, text)`
- Columns on `public.profiles`: `bio_long`, `cover_url`, `website_url` + checks
- Tables: `profile_places`, `profile_education`, `profile_work`, `profile_tags`, `profile_milestones`, `profile_links` (RLS, owner + audience policies, indexes, `set_row_updated_at` triggers except tags)
- Storage bucket `profile-covers` + four `storage.objects` policies

Prerequisites (not created by 35): `public.profiles`, `public.profile_follows`, `public.set_row_updated_at()`, `storage.buckets`, `storage.objects`, `storage.foldername`.

### 20260936 contents (SHA256 `D3A717BB…` — email RPC fix)

Additive communications identity + discovery. Does **not** copy `auth.users.email` to public tables.

Creates:

- Helpers: `comms_identity_digest`, `comms_normalize_email`, `comms_normalize_e164`
- Tables: `communication_phone_identities`, `communication_privacy_settings`, `communication_contact_sync_state`
- RPCs: `ensure_own_communication_privacy`, `comms_public_identity`, `discover_user_by_username|email|phone`, privacy/phone/contact-sync getters/setters, `bind_own_phone`, `unbind_own_phone`, `comms_phone_identity_guard`

**Email RPC fix confirmed** in `discover_user_by_email`:

```sql
insert into public.communication_privacy_settings (user_id)
values (v_target)
on conflict on constraint communication_privacy_settings_pkey do nothing;
```

Other `ON CONFLICT (user_id)` sites in the same file are unchanged (`ensure_own_communication_privacy`, `discover_user_by_phone`, `bind_own_phone`, contact-sync). Phone discovery still has the PL/pgSQL `RETURNS TABLE (user_id …)` ambiguity, but that insert is unreachable until a verified phone exists.

Prerequisites (not created by 36): `auth.users(id,email,email_confirmed_at)`, `public.profiles(id,username,display_name,full_name,avatar_url)`, `extensions.digest`.

36 does **not** depend on 35 objects.

---

## 2. Inspect `20260934`

| Field | Value |
| --- | --- |
| Filename | `20260934_learning_teacher_student_platform_v1.sql` |
| Purpose | Learning teacher + student platform: teacher profiles, course products, reviews, earnings placeholders, welcome-video hooks, teacher RPCs |
| On `origin/alpha-0.2` | **YES** (identical to this worktree; empty diff) |
| In candidate delta vs alpha | **NO** |
| Live `schema_migrations` row | **ABSENT** |
| Live objects | **ABSENT** (`learning_teacher_profiles`, course products, reviews, earnings, welcome-video hooks, `is_approved_learning_teacher`) |
| Applied under another name? | **NO** — name search for `%learning_teacher_student%` empty; objects absent |
| Do 35 or 36 depend on it? | **NO** — neither file references Learning teacher objects or `20260934` |

Git-reserved on Central. Not live. Last preflight said the same; **re-confirmed**.

Standing hazard: this file sits in `supabase/migrations/` on alpha **and** this branch. Any untargeted `db push` / `migration up` would apply Learning 34 as a side effect.

---

## 3. Live `schema_migrations` (SELECT only)

Catalog columns: `version text`, `statements ARRAY`, `name text`.

| version | name | live? |
| --- | --- | --- |
| `20260915` | `store_partial_refund_provider_money_execution_v1` | YES (Store — **not** rich profile) |
| `20260916` | `learning_lesson_bookmarks_v1` | YES (Learning — **not** comms identity) |
| `20260933` | `rewards_referral_launch_v1` | YES — **tip** |
| `20260934` | — | **NO** |
| `20260935` | — | **NO** |
| `20260936` | — | **NO** |

```text
LIVE_TIP = 20260933
ROW_COUNT = 110
LIVE_20260934 = ABSENT
LIVE_20260935 = ABSENT
LIVE_20260936 = ABSENT
NAME_COLLISION_RICH_PROFILE = NONE
NAME_COLLISION_COMMS_IDENTITY = NONE
```

Hosted `202609xx` present: `00–02`, `05–28`, `30`, `32`, `33`. Gaps: `03`, `04`, `29`, `31`, plus **34/35/36 unused**.

---

## 4. Prerequisite existence (hosted SELECT)

### 20260935 prerequisites — LIVE = YES

| Object | Live |
| --- | --- |
| `public.profiles` | YES — `id uuid` PK, `username` unique, `bio`, `display_name`, `full_name`, `avatar_url` |
| `profiles.bio_long` / `cover_url` / `website_url` | **NO** (35 will add) |
| `public.profile_follows.follower_id` / `following_id` | YES uuid |
| `public.set_row_updated_at()` | YES — `returns trigger` |
| `storage.buckets` / `storage.objects` / `storage.foldername` | YES |
| `storage.buckets` id `profile-covers` | **NO** (35 will add) |
| `can_read_profile_audience` | **NO** |
| `profile_places` / `education` / `work` / `tags` / `milestones` / `links` | **NO** |

### 20260936 prerequisites — LIVE = YES

| Object | Live |
| --- | --- |
| `auth.users` `id` / `email` / `email_confirmed_at` | YES (uuid / varchar / timestamptz) |
| `public.profiles` identity columns | YES |
| `extensions.digest` | YES |
| `communication_phone_identities` | **NO** |
| `communication_privacy_settings` | **NO** |
| `communication_contact_sync_state` | **NO** |
| All 36 functions (`discover_user_by_*`, `bind_own_phone`, …) | **NO** |

```text
PARTIAL_APPLY_RISK_35 = NO
PARTIAL_APPLY_RISK_36 = NO
35_36_OBJECTS_ALREADY_LIVE = NO
```

### Pepper (boolean only)

`app.settings.comms_identity_pepper` **unset**. File fallback is the documented domain separator. Owner should set a pepper **before** first 36 apply if production hashes must be unique. Do not commit the value. Do not set it in this preflight.

---

## 5. `communication_privacy_settings_pkey` live proof

```sql
-- pg_constraint + information_schema
-- result: 0 rows
```

```text
LIVE_CONSTRAINT_NAME = ABSENT
LIVE_TABLE = ABSENT
LIVE_CONSTRAINT_COLUMNS = ABSENT
EXPECTED_AFTER_36 = communication_privacy_settings_pkey
EXPECTED_COLUMNS = user_id
EXPECTED_TYPE = PRIMARY KEY
```

Absence is **expected**. `20260936` creates:

```sql
create table if not exists public.communication_privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ...
);
```

PostgreSQL names that PK `communication_privacy_settings_pkey`. The email RPC in the **same file** (after the CREATE TABLE) references that constraint. Local Docker already proved the name in the prior email-fix GO. Hosted cannot show the constraint until 36 is applied.

---

## 6. Targeted apply plan — **DO NOT EXECUTE**

### TARGETED_APPLY_METHOD

`EXPLICIT_DB_QUERY_FILE_THEN_SCHEMA_MIGRATIONS_INSERT`

Apply **only** these two files, in order, with the exact file path. Then record **only** those two versions.

1. Re-SELECT tip. Abort if tip ≠ `20260933` or if `20260934/35/36` rows appeared.
2. Optional owner step: set `app.settings.comms_identity_pepper` (not this GO; never print the value).
3. Apply 35 only:

```text
npx supabase db query --linked --project-ref <hosted-umtuba-ref> --file supabase/migrations/20260935_rich_personal_profile_foundation_v1.sql
```

4. SELECT-verify 35 objects exist; `20260934` still absent; Learning teacher objects still absent.
5. Apply 36 only:

```text
npx supabase db query --linked --project-ref <hosted-umtuba-ref> --file supabase/migrations/20260936_communications_identity_discovery_v1.sql
```

6. After each successful file, INSERT **one** history row (version + name only; no statements dump required):

```sql
-- after 35
insert into supabase_migrations.schema_migrations (version, name)
values ('20260935', 'rich_personal_profile_foundation_v1');

-- after 36
insert into supabase_migrations.schema_migrations (version, name)
values ('20260936', 'communications_identity_discovery_v1');
```

`db query --file` executes SQL and does **not** auto-insert `schema_migrations`. That is why the insert is a separate explicit step.

At apply-GO time, wrap each file in `BEGIN;` … `COMMIT;` via a **one-file** wrapper that contains only that migration. Do not put 34 in any wrapper.

### UNINTENDED_20260934_APPLY_PREVENTED = YES

How:

- Never run `supabase db push`, `supabase db push --linked`, `migration up`, `db reset`, or `--include-all`.
- Never apply the whole `supabase/migrations/` directory.
- Never pass `20260934_learning_teacher_student_platform_v1.sql` to `--file`.
- Never INSERT version `20260934`.
- After each step, SELECT prove `20260934` absent **and** `learning_teacher_profiles` (and sibling 34 objects) still absent.
- Keep 34 on disk (already on alpha). Do not delete it. Just do not execute it.

---

## 7. TRANSACTION_PLAN — **DO NOT EXECUTE**

1. **35** = one transaction (`BEGIN` + 35 SQL + `COMMIT`). On any error: `ROLLBACK`. Stop. Do not start 36. Do not insert `20260935`.
2. SELECT-verify 35. If incomplete: run 35 rollback (below). Stop.
3. Insert `20260935` history row in its own short transaction.
4. **36** = one transaction (`BEGIN` + 36 SQL + `COMMIT`). On any error: `ROLLBACK` 36 only. Leave 35 in place unless owner orders 35 rollback.
5. SELECT-verify 36 including `communication_privacy_settings_pkey (user_id)` and email RPC definition.
6. Insert `20260936` history row in its own short transaction.

Do not wrap 35+36+34 in one session. Do not use a directory-wide migrator.

---

## 8. BACKUP_PLAN — **DO NOT EXECUTE**

Before any apply GO:

1. `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version` — save the 110-row list.
2. `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position`.
3. `SELECT count(*) FROM public.profiles` (count only; no profile rows / PII).
4. `SELECT id, name FROM storage.buckets` (ids/names only).
5. Confirm 35/36 tables absent so there is no user data to dump for those objects.
6. Do **not** dump `auth.users`, emails, phones, keys, or `.env`.

Optional: schema-only snapshot of `public.profiles` constraints. Not a full database dump unless owner asks in the apply GO.

---

## 9. ROLLBACK_PLAN — **DO NOT EXECUTE**

Rollback **36 first**, then 35. Never drop 34 objects (they should not exist).

**36**

- `DROP TRIGGER IF EXISTS comms_phone_identity_guard_trg ON public.communication_phone_identities;`
- Drop all 36 functions (`discover_user_by_*`, `bind_own_phone`, `unbind_own_phone`, privacy/contact-sync RPCs, normalize/digest/guard, `comms_public_identity`, `ensure_own_communication_privacy`).
- `DROP TABLE IF EXISTS public.communication_contact_sync_state, public.communication_privacy_settings, public.communication_phone_identities CASCADE;`
- `DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260936';`

**35**

- Drop the four `profile-covers` policies on `storage.objects`.
- Delete objects in bucket `profile-covers` only if any were uploaded; then `DELETE FROM storage.buckets WHERE id = 'profile-covers';`
- `DROP TABLE IF EXISTS public.profile_links, public.profile_milestones, public.profile_tags, public.profile_work, public.profile_education, public.profile_places CASCADE;`
- `ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio_long, DROP COLUMN IF EXISTS cover_url, DROP COLUMN IF EXISTS website_url;`
- `DROP FUNCTION IF EXISTS public.can_read_profile_audience(uuid, text);`
- `DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260935';`

Do not delete `20260933` or any earlier row. Do not drop `profiles` / `profile_follows`.

---

## 10. POST_APPLY_CHECKS — **DO NOT EXECUTE**

After a future apply GO, SELECT-only:

1. `schema_migrations`: tip `20260936`, row count `112`, names `rich_personal_profile_foundation_v1` and `communications_identity_discovery_v1`.
2. `20260934` still **absent**. Learning teacher tables / `is_approved_learning_teacher` still **absent**.
3. 35 objects exist: new profile columns, six tables, `can_read_profile_audience`, bucket `profile-covers`.
4. 36 objects exist: three communication tables + discovery/privacy/phone RPCs.
5. `communication_privacy_settings_pkey` exists on `public.communication_privacy_settings`, type `p` / PRIMARY KEY, columns **`user_id`**.
6. `pg_get_functiondef('discover_user_by_email(text)')` contains `on conflict on constraint communication_privacy_settings_pkey` and does **not** use `on conflict (user_id)`.
7. Existing `profiles` columns (`id`, `username`, `bio`, …) unchanged.
8. No 34 version insert. No `db push` residue.

---

## 11. Confirmation

```text
SQL_APPLIED = NO
PRODUCTION_CHANGED = NO
35_36_OBJECTS_ALREADY_LIVE = NO
PARTIAL_APPLY_RISK = NO
PLAN_EXECUTED = NO
```

---

## Return block

```text
TASK_ID = PRODUCTION_MIGRATION_35_36_READ_ONLY_PREFLIGHT_V1
STATUS = READ_ONLY_PREFLIGHT_COMPLETE
CANDIDATE_SHA_REVIEWED = 4eb8e91aff6310d243547790d867690663a6827d
LIVE_TIP = 20260933 (110 rows)
MIGRATION_20260934_NAME = 20260934_learning_teacher_student_platform_v1.sql
MIGRATION_20260934_LIVE_STATUS = NOT_LIVE
MIGRATION_20260934_DEPENDENCY = NONE
20260935_PREREQUISITES_LIVE = YES
20260936_PREREQUISITES_LIVE = YES
LIVE_CONSTRAINT_NAME = ABSENT
LIVE_CONSTRAINT_COLUMNS = ABSENT_LIVE / EXPECTED user_id
TARGETED_APPLY_METHOD = EXPLICIT_DB_QUERY_FILE_35_THEN_36_THEN_SCHEMA_MIGRATIONS_INSERT
UNINTENDED_20260934_APPLY_PREVENTED = YES
TRANSACTION_PLAN = SEPARATE_BEGIN_COMMIT_PER_FILE_35_FIRST
BACKUP_PLAN = SCHEMA_MIGRATIONS_PLUS_PROFILES_COLUMNS_COUNT_PLUS_BUCKET_IDS
ROLLBACK_PLAN = DROP_36_THEN_35_DELETE_ONLY_THOSE_HISTORY_ROWS
POST_APPLY_CHECKS = VERSIONS_35_36_PRESENT_34_ABSENT_PKEY_USER_ID_EMAIL_RPC_NAMED_CONSTRAINT
PRODUCTION_CHANGED = NO
BLOCKERS = NONE_FOR_PREREQS; PEPPER_UNSET_PRE_APPLY_DECISION; NAIVE_DB_PUSH_WOULD_APPLY_34
NEXT_RECOMMENDED_STEP = WAIT_FOR_SEPARATE_TARGETED_APPLY_GO
```
