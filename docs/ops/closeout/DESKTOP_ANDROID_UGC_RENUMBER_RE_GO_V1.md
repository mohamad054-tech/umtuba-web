# DESKTOP_ANDROID_UGC_RENUMBER_RE_GO_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR / UGC_SOURCE_OWNER  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** RELEASE_CRITICAL  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_ANDROID_UGC_RENUMBER_RE_GO_V1  
**CENTRAL_PACKET:** `CENTRAL_GO_DESKTOP_ANDROID_UGC_RENUMBER_RE_GO_V1.md` — **not found** on disk / SMB inbox / intake / docs/ops / FROM-CENTRAL / TO-DESKTOP. Executed from this GO prompt + Central 2026-08-14 delta.  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1`  
**MOBILE (preserved, not rebuilt):** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b33561` + uncommitted UGC / versionCode 4 AAB  

Central rejected Desktop `20260922` UGC (`c708fb1a`) because that version is already used (`knowledge_acquisition_foundation_v1`). This packet renumbers unapplied UGC to a unique ID ≥ `20260928` and makes `is_platform_admin()` self-contained for targeted apply. Desktop did **not** apply the migration, upload Play, rebuild AAB, or start AUTH_ENV / AASA / Play-upload waves.

---

## Verdict

| Field | Result |
|------|--------|
| COLLISION_20260922_CONFIRMED | **YES** |
| COLLIDES_WITH | `knowledge_acquisition_foundation_v1` (Central production `schema_migrations`; git filename on remotes is `20260876_knowledge_acquisition_foundation_v1.sql`) |
| OLD_MIGRATION_ID | `20260922` |
| NEW_MIGRATION_ID | `20260928` |
| NEW_MIGRATION_FILENAME | `supabase/migrations/20260928_ugc_safety_reports_blocks_v1.sql` |
| IS_PLATFORM_ADMIN_FIXED | **YES** |
| LEARNING_MIGRATION_PRESERVED | **YES** |
| MIGRATION_SEMANTICS_UNCHANGED | **YES** (UGC tables/RPCs/RLS unchanged; admin helper ensure + explicit `auth.uid()` only) |
| MIGRATION_TARGETED_APPLY_READY | **YES** |
| EXISTING_V4_AAB_STILL_VALID | **YES** |
| NEW_AAB_REQUIRED | **NO** (SQL-only) |
| GOOGLE_PLAY_MUTATED | **NO** |
| PRODUCTION_MUTATED | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| BACKEND_POLICY_READY | **NO** until Central targeted-applies `20260928` |
| GOOGLE_PLAY_V4_UPLOAD_SAFE | **NO** until that apply + runtime PASS |
| VERDICT | **RENUMBERED / ADMIN_HELPER_FIXED / WAIT_CENTRAL_TARGETED_APPLY** |

---

## Phase 0 — Sync / packets

- `git fetch --prune` on web. `office/profile-hero-completeness-v1` was even with origin at `c708fb1a5358e7e4223e46a0ee0e02388cd3f9f4` (0 ahead / 0 behind). No diverge. No merge/rebase/stash/reset.
- `origin/alpha-0.2` advanced `4e075f9` → **`f8e142d8cf7faab9646f127c1995e351be94fb37`** (matches Central production SHA). Desktop did not merge onto it.
- Central apply-failure packets (`…_20260873_V1.md`, `…_20260922_TARGETED_APPLY_V1.md`, `CENTRAL_GO_DESKTOP_ANDROID_UGC_RENUMBER_RE_GO_V1.md`) **not present** on this machine or SMB inbox/intake.
- Mobile WIP preserved (`master` @ `3b33561`, behind `origin/master` by 2). No ff/stash. No v4/v5 rebuild.

---

## Phase 1 — Registry

Scanned local `supabase/migrations`, `origin/alpha-0.2` (`f8e142d`), `origin/master`, `origin/office/profile-hero-completeness-v1`, **all** `origin/*` tips, and local `worktrees/`.

| ID | Owner | Where |
|----|--------|--------|
| `20260873` | Learning `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` | many origin Learning/collab tips. **Not** on this worktree. **Not** overwritten. |
| `20260876` | `20260876_knowledge_acquisition_foundation_v1.sql` | many origin office/AI tips. Git filename. |
| `20260914` | translation studio (max on `origin/alpha-0.2`) | production git tip |
| `20260915` | store partial refund (DESKTOP-A2 worktree only) | local worktree |
| `20260921` | `20260921_learning_certification_persistence_v1.sql` | origin Learning tips |
| `20260922` | **TAKEN** — Central: `knowledge_acquisition_foundation_v1` already registered. This branch previously had UGC at this ID (`c708fb1a`). | production `schema_migrations` (Central) + this branch pre-rename |
| `20260923`–`20260927` | none in git remotes / local / worktrees | unused, but Central required ≥ `20260928` |
| `20260928`+ | **none** before this packet | **chosen** |

`20260922` confirmed taken. Next unique ID ≥ `20260928` = **`20260928`**.

---

## Phase 2 — Renumber

- `git mv` `20260922_ugc_safety_reports_blocks_v1.sql` → `20260928_ugc_safety_reports_blocks_v1.sql`
- No second UGC copy left at `20260922`
- Learning `20260873_*` never present on this worktree; not touched
- `knowledge_acquisition` files never touched

---

## Phase 3 — `is_platform_admin()`

UGC SELECT policy on `ugc_reports` called `public.is_platform_admin()` (zero-arg). Canonical helper lives only in `20260806_ads_admin_review_foundation_v1.sql` (present on `origin/alpha-0.2`):

```sql
create or replace function public.is_platform_admin(
  p_user_id uuid default auth.uid()
)
```

Targeted apply of UGC alone can fail if that function is missing or the zero-arg call does not resolve.

**Smallest safe fix (this file, section 0):**

- `CREATE TABLE IF NOT EXISTS public.platform_admins` matching 20260806 columns
- `ENABLE` + `FORCE` RLS (hardening; no new write policies; no grants added to `authenticated` here)
- `CREATE OR REPLACE FUNCTION public.is_platform_admin(uuid default auth.uid())` — same `SECURITY DEFINER` / `search_path = public` / exists-on-`platform_admins` body as 20260806
- `REVOKE ALL` from `public, anon`; `GRANT EXECUTE` to `authenticated, service_role` only
- Policy now calls `public.is_platform_admin((select auth.uid()))` (explicit uuid signature)

Does **not** weaken RLS. Does **not** expose service-role to clients. Does **not** add admin write paths.

---

## Phase 4 — Validate

| Check | Result |
|------|--------|
| Duplicate `20260928` | **NO** |
| Leftover UGC at `20260922` | **NO** |
| Learning file unchanged | **YES** (absent locally; remotes untouched) |
| Mobile UGC/safety vitest | **13/13 PASS** (4 files; mobile source not edited) |
| `git diff --check` | **PASS** (CRLF warning only) |
| `SERVICE_ROLE_EXPOSED` | **NO** |
| Web tsc / build | **N/A** (SQL + docs only) |
| Remote apply / `db push` | **NOT RUN** |

---

## Phase 5 — Commit / push

Focused commit only: migration rename + admin helper + this closeout. Unrelated `docs/ai/*` and other closeouts **not** included. Normal push, no force.

See DESKTOP REPORT after push for `COMMIT_SHA` / `REMOTE_SHA`.

---

## Phase 6 — Central action (targeted only)

**Do NOT `supabase db push`.**  
**Do NOT apply from Desktop.**  
**Do NOT apply `20260873` or `20260922` as UGC.**

1. Fetch this branch/commit (SHA in DESKTOP REPORT).
2. Verify `20260928` is unique in the integration tree and in remote `schema_migrations`.
3. Targeted-apply **only** `supabase/migrations/20260928_ugc_safety_reports_blocks_v1.sql`.
4. Register history only after successful apply.
5. Runtime-test: report content, report user, block user, unauthorized mutation rejection, identity spoofing rejection.
6. Only after PASS: `BACKEND_POLICY_READY = YES`, `GOOGLE_PLAY_V4_UPLOAD_SAFE = YES`.

Existing v4 AAB remains valid (SQL-only; mobile bundle unchanged):

`C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab`  
SHA256 `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`

Account deletion URL still READY: `https://umtuba.com/account-deletion`  
AUTH_ENV still missing on Central — **not** attempted this task.

---

## DESKTOP REPORT

```
TASK_ID = DESKTOP_ANDROID_UGC_RENUMBER_RE_GO_V1
COLLISION_20260922_CONFIRMED = YES
COLLIDES_WITH = knowledge_acquisition_foundation_v1 (Central production registry; git file 20260876_knowledge_acquisition_foundation_v1.sql)
OLD_MIGRATION_ID = 20260922
NEW_MIGRATION_ID = 20260928
NEW_MIGRATION_FILENAME = supabase/migrations/20260928_ugc_safety_reports_blocks_v1.sql
IS_PLATFORM_ADMIN_FIXED = YES
LEARNING_MIGRATION_PRESERVED = YES
MIGRATION_SEMANTICS_UNCHANGED = YES
MIGRATION_TARGETED_APPLY_READY = YES
EXISTING_V4_AAB_STILL_VALID = YES
NEW_AAB_REQUIRED = NO
BRANCH = office/profile-hero-completeness-v1
COMMIT_SHA = (filled after push)
PUSH_PERFORMED = (filled after push)
REMOTE_SHA = (filled after push)
CENTRAL_FETCH_READY = (filled after push)
GOOGLE_PLAY_MUTATED = NO
PRODUCTION_MUTATED = NO
CENTRAL_ACTION_REQUIRED = fetch SHA; targeted-apply ONLY 20260928_ugc_safety_reports_blocks_v1.sql; never db push; never 20260873/20260922 as UGC; then BACKEND_POLICY_READY / GOOGLE_PLAY_V4_UPLOAD_SAFE
BLOCKERS = none on Desktop; Central apply still required
VERDICT = RENUMBERED / ADMIN_HELPER_FIXED / WAIT_CENTRAL_TARGETED_APPLY
```
