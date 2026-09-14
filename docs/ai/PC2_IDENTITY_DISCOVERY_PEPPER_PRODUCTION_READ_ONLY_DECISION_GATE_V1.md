# PC2 — Identity discovery pepper production read-only decision gate V1

```text
TASK_ID = IDENTITY_DISCOVERY_PEPPER_PRODUCTION_READ_ONLY_DECISION_GATE_V1
STATUS = READ_ONLY_DECISION_GATE_COMPLETE
DEVICE = PC2
DATE = 2026-09-02
CANDIDATE_SHA_REVIEWED = 4eb8e91aff6310d243547790d867690663a6827d
BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
SQL_APPLIED = NO
DB_PUSH = NO
MIGRATION_UP = NO
CONFIGURATION_EXECUTED = NO
PRODUCTION_CHANGED = NO
SECRET_VALUE_EXPOSED = NO
```

Isolated worktree only. Dirty primary checkout was **not** reset. No hosted write. No `ALTER DATABASE`. No apply of `20260934` / `20260935` / `20260936`. No `.env` printed.

Prior hosted boolean (preflight V1, SELECT only): `app.settings.comms_identity_pepper` = **UNSET**. This GO did **not** re-query the raw GUC.

---

## Return block

```text
TASK_ID = IDENTITY_DISCOVERY_PEPPER_PRODUCTION_READ_ONLY_DECISION_GATE_V1
STATUS = READ_ONLY_DECISION_GATE_COMPLETE
PEPPER_SETTING_NAME = app.settings.comms_identity_pepper
PEPPER_USED_FOR = SQL comms_identity_digest SHA-256 of (GUC || US || normalized E.164); bind_own_phone writes phone_e164_hash; discover_user_by_phone looks up that hash. Email/username discovery do not use it. App/lib/server do not hash.
ABSENCE_BEHAVIOR = APPLY_SUCCEEDS; current_setting missing_ok; empty/null coalesces to the committed domain-separator fallback (not a secret)
PEPPER_CHANGE_IMPACT = BREAKS_STORED_phone_e164_hash_AND_PHONE_SEARCH; plaintext phone_e164 unique index still blocks duplicate bind; no rehash RPC exists
DURABLE_SECRET_LOCATION = HOSTED_POSTGRES_DATABASE_GUC via ALTER DATABASE postgres SET (pg_db_role_setting). Not Git. Not .env. Not vault. Not Edge secrets.
SAFE_GENERATION_METHOD = Local CSPRNG 32-byte hex offline; never paste into chat, git, docs, tickets, or this report
SAFE_CONFIGURATION_METHOD = ALTER DATABASE postgres SET app.settings.comms_identity_pepper = '<local-only>'; then new session. Session SET is not durable.
NON_SECRET_VERIFICATION_METHOD = SELECT SET|UNSET (boolean). Optional left(sha256(guc),12) fingerprint. Never SELECT the raw GUC into reports/logs/chat.
REQUIRED_RELEASE_ORDER = SET_PEPPER (durable) → APPLY_20260935 → APPLY_20260936 → SOURCE_MERGE_DEPLOY
ROTATION_SUPPORTED = NO
PRODUCTION_CHANGED = NO
SECRET_VALUE_EXPOSED = NO
BLOCKERS = PEPPER_UNSET_LIVE (not a hard apply-fail); MUST_SET_BEFORE_FIRST_PHONE_HASH; NAIVE_DB_PUSH_WOULD_APPLY_34
NEXT_RECOMMENDED_STEP = OWNER_SETS_PEPPER_OFFLINE_THEN_WAIT_FOR_SEPARATE_TARGETED_APPLY_GO_35_THEN_36
```

---

## 1. What the candidate actually reads

File: `supabase/migrations/20260936_communications_identity_discovery_v1.sql` @ `4eb8e91a`.

### Authoritative identifier

| Kind | Name | Status |
| --- | --- | --- |
| **Authoritative Postgres GUC** | `app.settings.comms_identity_pepper` | **This is the only name the digest reads** |
| Set method documented in the migration | `ALTER DATABASE postgres SET app.settings.comms_identity_pepper = '...'` | Durable, all new sessions |
| Read method in SQL | `current_setting('app.settings.comms_identity_pepper', true)` | `true` = missing_ok; no exception if unset |
| Env / `.env.example` | none | No `PEPPER`, `COMMS_IDENTITY`, or `IDENTITY_PEPPER` key |
| Vault / `supabase_vault` / `[db.vault]` | none | `[db.vault]` is commented out in `supabase/config.toml`; no `vault.create_secret` usage |
| Edge / hosted function secrets | none | Not referenced |
| Hypothetical `umtuba_identity_pepper` / `app.settings.umtuba_identity_pepper` | **does not exist** | Do not invent this name |
| Related but different GUC | `app.comms_allow_phone_verify` | Session flag for future OTP; **not** the pepper |

**Pick:** `app.settings.comms_identity_pepper` (Postgres custom GUC). There is no env alias.

### Where the pepper is used

Only inside `public.comms_identity_digest(text)`:

1. Read GUC (missing_ok).
2. If null/empty, use the **committed domain-separator fallback** already in the migration (explicitly documented as **not a secret**).
3. Concatenate: `pepper_or_fallback || chr(31) || p_normalized`.
4. `extensions.digest(..., 'sha256')` → hex. Not HMAC.

Callers of that helper (same file):

| Caller | Uses digest? | Effect |
| --- | --- | --- |
| `bind_own_phone` | YES | Writes `communication_phone_identities.phone_e164_hash` (64 hex chars, unique) |
| `discover_user_by_phone` | YES | Looks up `phone_e164_hash` + requires `phone_verified_at` |
| `discover_user_by_email` | NO | Exact match on confirmed `auth.users.email` |
| `discover_user_by_username` | NO | Exact match on `profiles.username` |
| `unbind_own_phone` / privacy / contact-sync | NO | |

App / lib / server (`app/actions/communications.ts`, `lib/supabase/communicationsDiscovery.ts`, `lib/comms/phoneIdentity.ts`, `lib/comms/emailIdentity.ts`):

- Normalize E.164 / email only.
- Call RPCs. **Never hash. Never HMAC. Never read the GUC.**
- Ads `hmac_sha256` in event-report contracts is unrelated.

The table also stores **plaintext** `phone_e164` (owner-visible via `get_own_phone_identity`, unique index). The hash is for lookup / second uniqueness key, not the only copy of the number.

`comms_identity_digest` is `REVOKE`d from `public`, `anon`, and `authenticated`. Clients cannot call it.

### Absence behavior

**Apply of `20260936` does not fail** if the GUC is missing.

- `current_setting(..., true)` returns null instead of erroring.
- `nullif(..., '')` then `coalesce` to the committed domain-separator fallback.
- First `bind_own_phone` would still write hashes. Those hashes are then **globally reproducible** from the public migration text.

Prior hosted SELECT (boolean only): **UNSET**.

### Changing the pepper later

**Breaks phone search** for every already-written `phone_e164_hash`.

- New `comms_identity_digest(e164)` will not match old rows.
- `discover_user_by_phone` returns not-found for existing verified numbers.
- Hash uniqueness check in `bind_own_phone` will not see old hashes. The **plaintext** unique index on `phone_e164` still blocks binding the same E.164 twice.
- Email and username discovery are unaffected.
- Function is marked `IMMUTABLE` while it reads a GUC. That is a catalog lie (should be `STABLE`). Do not build expression indexes on it. After `ALTER DATABASE SET`, **new sessions** see the new GUC; the current session does not.

There is **no** rehash RPC, no dual-pepper window, no vault version column. `ROTATION_SUPPORTED = NO`.

A future owner GO could recompute hashes from stored plaintext `phone_e164` under a new GUC. That procedure does not exist and must not be improvised here.

---

## 2. Durable secret storage that fits this architecture

Requirement: not in Git; not in reports/logs/chat; stable after restart/deploy; readable as `current_setting('app.settings.comms_identity_pepper')` inside Postgres.

| Candidate | Fits? | Why |
| --- | --- | --- |
| **`ALTER DATABASE postgres SET app.settings.comms_identity_pepper`** | **YES — authoritative** | Exactly what `20260936` documents. Stored in `pg_db_role_setting`. Survives restart, pause/resume, and app deploy. Visible to all **new** sessions on database `postgres`. |
| Session `SET app.settings.comms_identity_pepper` | NO | Lost on disconnect. Pooler recycles connections. |
| `ALTER ROLE … SET` (one role only) | NO as primary | Easy to miss `authenticator` / pooler / `postgres`. Database-level SET covers all roles. |
| Next.js / Vercel / `.env` / `.env.example` | NO | App never reads a pepper. Would not reach SQL `current_setting`. |
| Supabase Edge secrets / `supabase secrets` | NO | Edge runtime only. SQL digest cannot see them. |
| `supabase_vault` / `[db.vault]` | NO without a new migration | Vault is unused. Digest does not read `vault.decrypted_secrets`. Learning `vault_ref` is sandbox pedagogy, not this GUC. |
| Hosted dashboard “secrets” UI | NO as the runtime source | Fine as an **operator backup** of the same value the owner already set via `ALTER DATABASE`. The function only sees the GUC. |
| Migration / source / docs | FORBIDDEN | Never store the value there. |

**Durable location (runtime):** hosted Postgres database `postgres`, custom GUC `app.settings.comms_identity_pepper`, set with `ALTER DATABASE`.

**Durable location (owner backup):** owner password manager or sealed offline note. Same rules: never Git, never chat, never this report.

Privileged roles can still `SHOW` / `current_setting` the raw GUC. That is why verification SQL must return only SET/UNSET or a short hash fingerprint, and why SQL-editor history should not be pasted into tickets.

---

## 3. Prepared generation (do not run in this GO)

Local only. Never paste the output into chat, git, docs, Slack, or tickets.

**PowerShell (CSPRNG, 32 bytes → 64 hex chars):**

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
```

**OpenSSL (if present):**

```text
openssl rand -hex 32
```

Write the result into the owner password manager immediately. Do not leave it in a shell scrollback that will be shared. Do not use `Get-Random` (not CSPRNG).

---

## 4. Prepared configuration (do not run in this GO)

Use the hosted SQL editor or a **new** privileged session. Do **not** put the value in a repo `.sql` file. Do **not** use `--file` from git. Do **not** `db push`.

```sql
-- Durable. Applies to NEW sessions only.
ALTER DATABASE postgres SET app.settings.comms_identity_pepper = '<paste-locally-never-commit>';
```

Then **disconnect and open a new session** before verifying. The session that ran `ALTER DATABASE` still has the old/empty GUC.

Do **not** use:

```sql
SET app.settings.comms_identity_pepper = '...';  -- session-only; not production
```

Do **not** wrap this in `20260936` or any new migration.

After SET: if `log_statement` is on, the statement (and value) can land in Postgres logs. Prefer a short private dashboard session; do not export that history.

---

## 5. Prepared non-secret verification (do not run in this GO)

Safe check (boolean / SET|UNSET only). This is the same idea as `docs/ai/pc2-preflight-q-pepper.sql`:

```sql
select
  case
    when current_setting('app.settings.comms_identity_pepper', true) is not null
     and btrim(current_setting('app.settings.comms_identity_pepper', true)) <> ''
    then 'SET'
    else 'UNSET'
  end as pepper_status;
```

Optional short non-reversible fingerprint (12 hex chars of SHA-256 of the GUC). Still never returns the value. Requires `extensions.digest` (already live):

```sql
select
  case
    when current_setting('app.settings.comms_identity_pepper', true) is not null
     and btrim(current_setting('app.settings.comms_identity_pepper', true)) <> ''
    then 'SET'
    else 'UNSET'
  end as pepper_status,
  case
    when current_setting('app.settings.comms_identity_pepper', true) is not null
     and btrim(current_setting('app.settings.comms_identity_pepper', true)) <> ''
    then left(encode(extensions.digest(
           convert_to(current_setting('app.settings.comms_identity_pepper', true), 'UTF8'),
           'sha256'
         ), 'hex'), 12)
    else null
  end as pepper_fingerprint;
```

**Forbidden verification:** `select current_setting('app.settings.comms_identity_pepper');` — that prints the secret.

Copy only `SET`/`UNSET` (and optionally the 12-char fingerprint) into reports.

The companion file `docs/ai/pc2-pepper-nonsecret-status-check-v1.sql` is this SET/UNSET probe only. It was **not** executed in this GO.

---

## 6. Release order

`20260935` does not read the pepper. `20260936` **creates** the digest and the first place hashes can be written. The digest reads the GUC **at call time**, not at `CREATE FUNCTION` time.

Hard invariant: **durable pepper must be SET before the first production `bind_own_phone` / first `phone_e164_hash` write.**

Required order:

1. **Set pepper** — `ALTER DATABASE postgres SET app.settings.comms_identity_pepper`. New session. Verify `SET` (and optional fingerprint). Owner backup in a password manager.
2. **Apply `20260935`** — rich profile. Independent of pepper. Targeted `--file` only. Then insert `schema_migrations` version `20260935` only.
3. **Apply `20260936`** — identity/discovery. Targeted `--file` only. Then insert version `20260936` only.
4. **Source merge / deploy** — app only calls RPCs. Deploy without 36 yields the existing PGRST202 copy, not a hash bug.

Do **not** apply `20260934`. Do **not** `db push` / `migration up` (would apply 34).

If 36 is applied while the GUC is still unset, the first bind uses the public domain-separator fallback. Setting a real pepper **after** that without a rehash **breaks phone search**. Email discovery would still work.

35 before 36 matches the existing targeted-apply preflight. Pepper before 36 is the new gate.

---

## 7. Confirmation

```text
SQL_APPLIED = NO
CONFIGURATION_EXECUTED = NO
PRODUCTION_CHANGED = NO
SECRET_VALUE_EXPOSED = NO
LIVE_PEPPER_STATUS_FROM_PRIOR_PREFLIGHT = UNSET
AUTHORITATIVE_NAME = app.settings.comms_identity_pepper
ROTATION_SUPPORTED = NO
```

STOP. Do not set the pepper from this GO. Do not apply 35/36. Wait for a separate owner configuration GO, then a separate targeted apply GO.
