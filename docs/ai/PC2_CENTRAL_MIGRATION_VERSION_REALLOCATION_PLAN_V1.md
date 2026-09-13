# PC2 — Central migration version reallocation plan V1

> Later incidental notes. **Not** the 31 August saved stop. Owner authority remains `SOURCE_PASS_MIGRATION_HOLD` in `docs/ai/PC2_2026_08_31_END_OF_DAY_PRESERVATION.md`. This plan does **not** authorize write / merge / apply.

```text
TASK_ID = CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO
DEVICE = PC2
DATE = 2026-09-02
STATUS = LIVE_TIP_VERIFIED_WAITING_RENUMBER_MERGE_GO
LIVE_REMOTE_TIP_VERIFIED = YES
LIVE_REMOTE_TIP_VERSION = 20260933
PROPOSED_VERSIONS_ALLOCATED = NO
SQL_FILES_CREATED = NO
CANDIDATE_MODIFIED = NO
UM_LIFE_MODIFIED = NO
PRODUCTION_TOUCHED = NO
PUSH = NO
MERGE = NO
DB_PUSH = NO
LINKED = NO
```

PC2-only. Do **not** treat this as PC1 Translation / laptop integrator work.
Do **not** re-review the candidate. Source already PASS (`SOURCE_PASS_MIGRATION_HOLD`).

---

## What this slice did

Owner resume (`كمل من وين انتهينا`) started this named gate on PC2.

Completed here:

1. `git fetch --prune` — no merge / rebase / reset / stash / force
2. Confirmed `origin/alpha-0.2` **did not move**
3. Confirmed candidate + UM Life SHAs match 2026-08-31 EOD
4. Built a git-visible + in-repo reserved-version inventory
5. Proposed (not allocated) unique versions **after** the git-visible tip

Stopped before:

- New SQL under `supabase/migrations/`
- Candidate product edits
- Renumber / source merge / apply / push / deploy

Hosted `schema_migrations` was queried read-only on 2026-09-02 (this slice).

---

## Live identities (re-confirmed 2026-09-02)

| Role | Value |
| --- | --- |
| Primary checkout | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` |
| Primary branch / HEAD | `pc2/umtuba-communications-v1-part1b-identity-discovery` @ `196a035801ea8cc992693f261052ee83b9390780` (ahead 3) |
| Central base | `origin/alpha-0.2` @ `b5fbeff29cb0f308481b38c06500c572cd44a9c4` — **UNCHANGED** |
| Candidate worktree | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-central-integration-candidate-v1` |
| Candidate branch | `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` (no upstream) |
| Candidate product SHA | `814226776ced7325b174665f773906e163efcb2d` |
| Candidate live HEAD | `75b3896c6a3852258f4e303c4cb54c17d1da5836` |
| UM Life worktree | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-09155b15` detached `09155b158228df7b5523d2388a53a02481f98726` (clean) |

```text
BASE_MOVED = NO
CANDIDATE_REBASE_REQUIRED = NO
COMMS_DIVERGENCE = NO
COMMS_AHEAD = 3
NEVER_PUSH = 0f89d449, d84dbda5, 196a0358, 75b3896c
```

---

## Why AMEND_FIRST still holds

| File on candidate | Decision | Why |
| --- | --- | --- |
| `20260915_rich_personal_profile_foundation_v1.sql` | AMEND_FIRST | In-repo remote map already used `20260915` for Store `store_partial_refund_provider_money_execution_v1`. Also sits before Central `20260928+` (insert-before-last hazard). |
| `20260916_communications_identity_discovery_v1.sql` | AMEND_FIRST | Version sits before Central `20260928+`. Body is **not** the defect. |

Neither filename exists on `origin/alpha-0.2`. Not `ALREADY_EQUIVALENT`.

Do **not** apply those version numbers. Do **not** rename them inside the candidate (that would replay `0f89d449` uniquify). Add **new** unique versions later.

---

## Authoritative SQL bodies (keep these)

Source of truth = **candidate**, not the comms checkout.

| Body | Candidate path | SHA256 |
| --- | --- | --- |
| Rich profile | `…candidate-v1/supabase/migrations/20260915_rich_personal_profile_foundation_v1.sql` | `A08262223A97D911FED9E8A486800AC35F8B167F4DA2EA04A75097805BA4AD30` |
| Comms identity | `…candidate-v1/supabase/migrations/20260916_communications_identity_discovery_v1.sql` | `CBA53172DB9EFA57B194636589C346297C5D9DDB7A511BE7BBE3C4BC63F13721` |

`20260915` body is identical on the comms checkout (same SHA256).

`20260916` is **not** identical:

| Tree | ON CONFLICT | SHA256 |
| --- | --- | --- |
| Candidate (keep) | `on conflict (user_id)` | `CBA53172…` |
| Comms `0f89d449` (never replay) | `on conflict on constraint …_pkey` | `BA9839D0…` |

If a later local apply needs the named-constraint form, that must be a **new additive** migration. Not a rewrite of this body.

Minor residual (not the amend reason): rich-profile `profile_tags` drops `profile_tags_set_updated_at` and does not recreate it.

Pepper: set on the database before first production apply. Do not commit the pepper.

---

## Git-visible reserved versions (202609xx)

### On `origin/alpha-0.2` (`b5fbeff2`)

`20260902`, `20260910`–`20260914`, `20260928`, `20260930`, `20260932`, `20260933`, `20260934`.

Highest Central file: **`20260934_learning_teacher_student_platform_v1.sql`**.

### Occupied on other origin lines (must not reuse)

| Version | Example occupant |
| --- | --- |
| `20260900` | Store partial-refund ledger RPC |
| `20260901` | Learning notes / Store list-committing / Translation persistence (historical collision set) |
| `20260903`–`20260909` | Translation / Learning / Store reallocations |
| `20260914` | Also Learning bookmarks on a non-alpha line |
| `20260915` | Store `store_partial_refund_provider_money_execution_v1` **and** candidate rich-profile **and** Learning bookmarks |
| `20260916` | Candidate comms identity **and** Learning bookmarks |
| `20260917` | Collaboration workspace settings |
| `20260918` | Learning structured course import |
| `20260919` | Collaboration workspace resource link |
| `20260921` | Learning certification persistence |
| `20260922` | UGC safety (later Central uses `20260928`) |

### Gaps that exist in git (`20260920`, `20260923`–`20260927`, `20260929`, `20260931`)

**Do not use.** Inserting below `20260934` is the documented insert-before-last hazard.

### Git-visible versions `> 20260934`

**None** on any local ref after fetch.

In-repo hosted map (`docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md`) last recorded remote tip as **`20260915` Store**. That map is **stale** relative to Central files already on `alpha-0.2`. It is still proof that `20260915` is taken on hosted.

---

## Proposed versions — NOT allocated

Hosted tip verified `20260933` (`≤ 20260934`). Keep:

```text
PROPOSED_RICH_PROFILE = 20260935_rich_personal_profile_foundation_v1.sql
PROPOSED_COMMS_IDENTITY = 20260936_communications_identity_discovery_v1.sql
BODY_RICH_PROFILE = candidate 20260915 (SHA256 A0826222…)
BODY_COMMS_IDENTITY = candidate 20260916 ON CONFLICT (user_id) (SHA256 CBA53172…)
```

If live hosted tip is `≥ 20260935`, bump both numbers to **tip + 1** and **tip + 2**. Do not guess a third collision.

```text
PROPOSED_VERSIONS_ALLOCATED = NO
SQL_FILES_CREATED = NO
```

Do **not** copy these into the candidate until the live tip is verified and a later write-GO says so.
Do **not** uniquify / delete the existing candidate `20260915` / `20260916` filenames (that is the `0f89d449` pattern).
At **source-merge GO** (separate): ship the new files; do not merge the colliding version numbers onto `alpha-0.2`.

---

## Live remote tip — verified 2026-09-02 (read-only)

```text
LIVE_REMOTE_SCHEMA_MIGRATIONS = QUERIED_SELECT_ONLY
TABLE = supabase_migrations.schema_migrations
COMMAND_CLASS = npx supabase db query --linked --project-ref <hosted-umtuba-ref>
SQL = SELECT version FROM supabase_migrations.schema_migrations ORDER BY version
ROW_COUNT = 110
HIGHEST_LIVE_VERSION = 20260933
GIT_RESERVED_MAX = 20260934
LIVE_20260935 = ABSENT / FREE
LIVE_20260936 = ABSENT / FREE
LIVE_VERSIONS_AT_OR_ABOVE_20260935 = NONE
PROPOSED_PAIR_KEPT = 20260935 / 20260936
DB_PUSH = NO
APPLY = NO
LINK_COMMAND = NO
```

CLI 2.116.0 rejected `--project-ref` without `--linked`. The sanctioned documented read path is `--linked` SELECT (`docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md`). No `--db-url`. No secrets printed.

Hosted `202609xx` present: `20260900`–`20260902`, `20260905`–`20260928`, `20260930`, `20260932`, `20260933`.

Hosted gaps below tip (do **not** use; insert-before-last): `20260903`, `20260904`, `20260929`, `20260931`. `20260934` is git-reserved on `origin/alpha-0.2` and **not** live.

`20260915` and `20260916` **are live** — confirms AMEND_FIRST. Do not apply the candidate files under those numbers.

```text
NEXT_REQUIRED_GO = PC2_RENUMBER_THEN_SOURCE_MERGE_GO
FORBIDDEN_UNTIL_THEN = write SQL, renumber, merge, apply, push, deploy
```

---

## Local stack at this write (2026-09-02)

| Check | Result |
| --- | --- |
| Docker client | 29.7.2 present |
| Docker engine | **DOWN** (desktop-linux pipe missing) |
| Local API `54321` / DB `54322` / Studio `54323` | **not listening** |
| Next `:3000` / `:3001` / `:3002` | **not listening** |

Stack was not restarted. This slice is docs/planning only. Restart later if a live tree is needed: Docker Desktop → WSL Ubuntu `giga_store` → `npx supabase start` from the comms checkout **inside WSL**. Never `--linked`. Never `db push`.

```text
CLI_LINKED_HOSTED_REF = tgucwnjwoyeqoxqaxmew
NEVER = supabase db push, --linked apply
```

---

## Later GOs (do not start from this plan)

1. ~~Read-only hosted tip verify~~ **DONE** 2026-09-02 — tip `20260933`
2. **Write new additive SQL** — still requires `PC2_RENUMBER_THEN_SOURCE_MERGE_GO` (bodies from candidate hashes; versions `20260935` / `20260936`)
3. **Source-merge GO** — include `75b3896c`; exclude `0f89d449`; do not push until authorized
4. **Targeted migration GO** — apply only the new versions
5. **Deploy GO**

```text
READY_FOR_SOURCE_MERGE = NO
READY_FOR_MIGRATION_APPLICATION = NO
READY_FOR_PRODUCTION_DEPLOY = NO
```

---

## PC2 vs PC1

- PC2 owns this candidate + this reallocation plan.
- Do not touch PC1 Translation Studio, laptop integrator cutover, or other-machine Store/Learning apply.
- Do not invent Communications Part 2, cover upload, HomeSocialComposer, or a second `/life` feed.
