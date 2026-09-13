# PC2 — 2026-08-31 end-of-day preservation

```text
TASK_ID = PC2_2026_08_31_END_OF_DAY_PRESERVATION
STATUS = PRESERVED
DEVICE = PC2
HP_MODEL = HP Z440 Workstation
DATE = 2026-08-31
RESUME_DATE = 2026-09-01
PRODUCTION_TOUCHED = NO
PUSH = NO
MERGE = NO
CENTRAL_REVIEW = SOURCE_PASS_MIGRATION_HOLD
SAFE_TO_SHUTDOWN = YES
```

Owner is shutting down PC2. This file is tomorrow’s start point. Do **not** repeat completed local gates or re-implement the candidate. Central review **finished** tonight — do **not** re-run it.

---

## Tomorrow FIRST ACTION

```text
1. Read this file
2. Read docs/ai/PC2_2026_09_01_RESUME.md
3. Read docs/ai/CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1.md
   (FINISHED — STATUS = SOURCE_PASS_MIGRATION_HOLD)
4. If local stack is down after reboot: Docker Desktop → WSL Ubuntu → supabase start
   (no --linked / no db push)
5. Next required gate only if owner starts it:
   CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO
```

Do **not** apply `20260915` / `20260916` to production. Do **not** reuse those version numbers. Do **not** replay `0f89d449`. Do **not** push `0f89d449`, `d84dbda5`, `196a0358`, or `75b3896c`. Do **not** merge to Central / `alpha-0.2`. Do **not** deploy, Play, or App Store.

---

## TASK chain completed today (do not repeat)

| Order | TASK_ID | STATUS | Evidence |
| --- | --- | --- | --- |
| 1 | `PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1` | `LOCAL_STACK_RECOVERED` | Local API `127.0.0.1:54321`, Studio `54323`, DB `54322`. Precursor + uniquify lived only in `0f89d449`. |
| 2 | `PC2_UMTUBA_LOCAL_APP_SUPABASE_INTEGRATION_GATE_V1` | `LOCAL_INTEGRATION_PROVED` | Next on `:3000`. Hosted requests 0. Local commit `d84dbda5`. |
| 3 | `PC2_UMTUBA_COMMUNICATIONS_RICH_PROFILE_LOCAL_COMPLETION_V1` | `LOCAL_COMPLETION_PROVED` | Email/phone/1:1/send-read/authz + rich privacy PASS. Local commit `196a0358`. |
| 4 | `PC2_UMTUBA_UM_LIFE_AUTHORITATIVE_LOCAL_GATE_V1` | `LOCAL_GATE_PROVED` | Detached worktree `09155b15` on `:3001`. `UM_LIFE_FIX_COMMIT = NONE`. |
| 5 | `PC2_UMTUBA_SOCIAL_COMM_PROFILE_CENTRAL_INTEGRATION_CANDIDATE_V1` | `LOCAL_CANDIDATE_READY` | Candidate `81422677` on `:3002`. `b67a7b33` XOR `d84dbda5`. `0f89d449` excluded. |
| 6 | `CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1` | `SOURCE_PASS_MIGRATION_HOLD` | **FINISHED.** Source PASS. Migrations AMEND_FIRST. Local fix `75b3896c`. |
| 7 | `PC2_2026_08_31_END_OF_DAY_PRESERVATION` | `PRESERVED` | This file + `PC2_2026_09_01_RESUME.md`. |

Morning resume from 2026-08-30 (`PC2_2026_08_31_RESUME.md`) is historical. VTx / WSL2 / Docker / local Supabase are already recovered. Do **not** redo BIOS.

---

## Authoritative Central review snapshot (FINISHED)

Report: `docs/ai/CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1.md`

```text
TASK_ID = CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1
STATUS = SOURCE_PASS_MIGRATION_HOLD
AUTHORITATIVE_BASE_REF = origin/alpha-0.2
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PC2_CANDIDATE_SHA = 814226776ced7325b174665f773906e163efcb2d
CENTRAL_REBASED_CANDIDATE_SHA = SAME / 81422677
LOCAL_REVIEW_FIX_SHA = 75b3896c6a3852258f4e303c4cb54c17d1da5836
DISCOVERY_NOT_FOUND_ACCEPTED = YES
DISCOVERY_NOT_FOUND_SHA = b67a7b33
SOURCE_REVIEW = PASS
BUILD = PASS
TYPECHECK = PASS
HOME = PASS
WATCH = PASS
UM_LIFE = PASS
MESSAGES = PASS
RICH_PROFILE = PASS
LEARNING = PASS
STORE = PASS
BRAND_REGRESSION = NO
SOCIAL_ARCHITECTURE_REGRESSION = NO
MIGRATION_20260915_DECISION = AMEND_FIRST
MIGRATION_20260916_DECISION = AMEND_FIRST
MIGRATION_GO_REQUIRED = YES
LOCAL_BOOTSTRAP_0F89D449_INCLUDED = NO
UNINTENDED_DIFF = NO
CONFLICTS_REMAINING = NO
READY_FOR_SOURCE_MERGE = NO
READY_FOR_MIGRATION_APPLICATION = NO
READY_FOR_PRODUCTION_DEPLOY = NO
PUSH = NO
MERGE = NO
NEXT_REQUIRED_GATE = CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO
```

Rebase was **not** required. Base did not advance. Do not rebase or rewrite the candidate unless `origin/alpha-0.2` moves.

---

## Local-only commits — NEVER PUSH

| SHA | Tree | Message | Why local-only |
| --- | --- | --- | --- |
| `0f89d449a77bd3cfbab54b12deb57ecb14dc6138` | comms checkout | `fix(local-supabase): bootstrap posts precursor and uniquify colliding local migration versions` | Reconstructs hosted-dashboard `posts` + uniquifies historical filenames. **MUST remain local-only.** Not an ancestor of the candidate. No migration filename uniquify in the candidate. |
| `d84dbda581cb0e907fd4486ddbeb525a827c90e6` | comms checkout | `fix(comms): do not export a sync helper from the server-actions module` | XOR loser vs `b67a7b33`. Valid on the dirty comms checkout only. |
| `196a035801ea8cc992693f261052ee83b9390780` | comms checkout | `fix(comms): wrap Messages SSR tree in I18nProvider` | Product wrap is already in the candidate; this SHA stays on the comms line. |
| `75b3896c6a3852258f4e303c4cb54c17d1da5836` | candidate worktree | `fix(web): keep UM Life distinct from Home on welcome nav` | Review-local welcome-nav fix. Include in any later source package. **Not pushed.** |

Comms branch is **ahead 3** of `origin/pc2/umtuba-communications-v1-part1b-identity-discovery` (`0f89d449`, `d84dbda5`, `196a0358`). None of those SHAs are on any remote branch. Candidate branch has **no upstream**.

```text
DO_NOT_PUSH = 0f89d449, d84dbda5, 196a0358, 75b3896c
DO_NOT_PUSH_BRANCHES = pc2/umtuba-communications-v1-part1b-identity-discovery (those 3), pc2/umtuba-social-comm-profile-central-integration-candidate-v1
```

---

## Candidate + base (live at write)

```text
CANDIDATE_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-central-integration-candidate-v1
CANDIDATE_BRANCH = pc2/umtuba-social-comm-profile-central-integration-candidate-v1
PC2_CANDIDATE_SHA = 814226776ced7325b174665f773906e163efcb2d
LIVE_CANDIDATE_HEAD = 75b3896c6a3852258f4e303c4cb54c17d1da5836
CANDIDATE_PARENT_OF_FIX = 814226776ced7325b174665f773906e163efcb2d
UPSTREAM = UNSET
BASE_REF = origin/alpha-0.2
BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
DISCOVERY_NOT_FOUND = b67a7b33 (accepted)
DISCOVERY_NOT_FOUND_XOR_LOSER = d84dbda5
0F89D449_ANCESTOR_OF_CANDIDATE = NO
```

Lineage: `b5fbeff2` → `81422677` (integrate UM Life + comms + rich profile) → `75b3896c` (welcome nav).

---

## Worktrees — exact live state (read-only inspect)

| Path | Branch / HEAD | SHA | `status --short` |
| --- | --- | --- | --- |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` | `pc2/umtuba-communications-v1-part1b-identity-discovery` | `196a035801ea8cc992693f261052ee83b9390780` | Dirty/untracked historical + today’s docs. Ahead 3, not pushed. **Write docs here only.** |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-09155b15` | detached `HEAD` | `09155b158228df7b5523d2388a53a02481f98726` | Clean. Do not modify. |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-central-integration-candidate-v1` | `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` | `75b3896c6a3852258f4e303c4cb54c17d1da5836` | `?? scripts/_pc2_central_integration_candidate_gate.mjs` only. Do not modify product files. |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-home-entry-v1` | `pc2/umtuba-um-life-home-entry-v1` | `ab3f7b03` (product `09155b15`) | Historical tip worktree. Not used as the 2026-08-31 gate tree. |

Many historical PC2-A1/A2/A3 / Store / Learning worktrees remain on disk. Not deleted. Not used tomorrow unless a later task names them.

---

## Local runtime at write (do not kill unless needed)

Verified listening at preservation write (2026-08-31 ~22:25 +03):

| Port | Role | Process | Status |
| --- | --- | --- | --- |
| `3000` | Comms checkout Next | `node` PID 17152 | UP |
| `3001` | UM Life `09155b15` Next | `node` PID 22084 | UP |
| `3002` | Candidate Next | `node` PID 22960 | UP |
| `54321` | Local Supabase API | WSL relay + Docker | UP |
| `54322` | Local Postgres | WSL relay + Docker | UP |
| `54323` | Local Studio | WSL relay + Docker | UP |

```text
LOCAL_API = http://127.0.0.1:54321
LOCAL_DB = 127.0.0.1:54322
LOCAL_STUDIO = http://127.0.0.1:54323
COMMS_APP = http://localhost:3000
UM_LIFE_APP = http://localhost:3001
CANDIDATE_APP = http://localhost:3002
```

Shutdown will stop these. Tomorrow: start Docker Desktop + WSL, then `npx supabase start` from the comms checkout **inside Ubuntu user `giga_store`**. Windows `npx supabase status` cannot see Docker. Never pass `--linked`. Never `db push`.

CLI remains **linked** to hosted project `tgucwnjwoyeqoxqaxmew` (`umtuba`). Link metadata is not permission to touch hosted.

```text
CLI_LINKED_HOSTED_REF = tgucwnjwoyeqoxqaxmew
NEVER = supabase db push, supabase db push --linked, remote apply of 20260915/20260916
```

---

## Migrations

| File | Where | Applied local | Applied production |
| --- | --- | --- | --- |
| `20260915_rich_personal_profile_foundation_v1.sql` | candidate + comms checkout | YES_LOCAL (comms stack earlier today) | **NO** |
| `20260916_communications_identity_discovery_v1.sql` | candidate = **original** `ON CONFLICT (user_id)`; comms `0f89d449` rewrote named-constraint | YES_LOCAL | **NO** |
| `20260711_local_bootstrap_posts_table_precursor_v1.sql` + uniquified `20260713*` / `20260805*` | **comms `0f89d449` only** | YES_LOCAL | **MUST NEVER** |

```text
MIGRATION_GO_REQUIRED = YES
MIGRATION_20260915_DECISION = AMEND_FIRST
MIGRATION_20260916_DECISION = AMEND_FIRST
PRODUCTION_MIGRATIONS_APPLIED = NO
PRODUCTION_DATABASE_CHANGED = NO
PRODUCTION_DATA_CHANGED = NO
```

**Why AMEND_FIRST:** in-repo remote map (`docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md`) already used **`20260915`** for Store `store_partial_refund_provider_money_execution_v1`. Both versions also sit before later Central files (`20260928+`). Reallocate to **new unique versions after a verified remote tip** (likely `20260935+` — confirm read-only). Keep SQL bodies. Do not silent-renumber shared history. Do not uniquify filenames inside the candidate as a replay of `0f89d449`.

If a fresh local apply ever needs `ON CONFLICT ON CONSTRAINT …_pkey`, that must be a **new additive migration**.

---

## Residuals (carry forward — do not “fix” unless a named gate)

### Local stack / comms checkout (`LOCAL_STACK_RECOVERED` + gates)

1. CLI linked to hosted `tgucwnjwoyeqoxqaxmew`. Never `db push` / `--linked`.
2. imgproxy / pooler may still be stopped (`status -o env` residual).
3. Phone OTP UI remains foundation-only.
4. Rich profile Places/education/work/milestone/link **Add** was not completed through Settings automation (viewer privacy used local-seeded rows; bio PASS).
5. Bio has no per-audience switch (public `profiles.bio` scalar).
6. `/life` is absent on the comms checkout (404). That is expected.
7. Historical dirty/untracked files in this checkout — leave them.

### UM Life gate

1. IDE browser flaky; Playwright was used.
2. Next `router.push` after login may leave automation on `/login` until hard navigation.
3. No dedicated `/post/[id]` page (latest-post layer + `?post=`).
4. Mobile SHA `4d07bd6c` not exercised.

### Candidate + Central review

1. Local welcome-nav fix `75b3896c` is on the candidate only — not pushed. Include it in any later source package.
2. `20260915` / `20260916` must be reallocated after verified remote tip before merge or apply.
3. Phase 1 `LifeExperience` remains on disk; `app/life/page.tsx` is the `09155b15` alias.
4. Home + UM Life both highlight on `/` (shared destination).
5. Cover upload / `profileCovers` and `HomeSocialComposer` (`4d4953d8`) not ported.
6. Full email/phone nobody + decoy-thread matrix not re-automated on Central chrome (username + send/read were).
7. Pre-existing Central tests: DiscoverShell overflow assertion; `JoinBetaLink` contract vs welcome cleanup.
8. Unused i18n `landing.badge` still contains “Alpha 0.2”; welcome does not render it.
9. Untracked `scripts/_pc2_central_integration_candidate_gate.mjs` — do not commit secrets; script has none.
10. `0f89d449` must never be integrated or replayed.

---

## Strict safety

```text
PRODUCTION = STRICTLY_FORBIDDEN
DEPLOY = NO
PUSH = NO
SHARED_MERGE = NO
DB_PUSH = NO
LINKED_APPLY = NO
FORCE_GIT = NO
```

Do not invent new product work. Do not start Communications Part 2. Do not add a second Facebook-style feed.

---

## Left uncommitted (preserved on disk — do not delete)

This EOD pass writes only docs in the primary checkout. Prefer **uncommitted** (this tree already has many untracked docs).

Today’s handoff docs (uncommitted / untracked):

- `docs/ai/PC2_2026_08_31_END_OF_DAY_PRESERVATION.md` (this file)
- `docs/ai/PC2_2026_09_01_RESUME.md`
- `docs/ai/CURRENT_TASK.md` (updated)
- `docs/ai/CURSOR_REPORT.md` (appended)
- `docs/ai/CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1.md`
- `docs/ai/PC2_UMTUBA_SOCIAL_COMM_PROFILE_CENTRAL_INTEGRATION_CANDIDATE_V1.md`
- `docs/ai/PC2_UMTUBA_UM_LIFE_AUTHORITATIVE_LOCAL_GATE_V1.md`
- `docs/ai/PC2_UMTUBA_COMMUNICATIONS_RICH_PROFILE_LOCAL_COMPLETION_V1.md`
- `docs/ai/PC2_UMTUBA_LOCAL_APP_SUPABASE_INTEGRATION_GATE_V1.md`
- `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md`

Unattributed / historical (comms checkout — leave):

- `M .env.example`, `M vitest.config.ts`
- Untracked historical PC2 A1–A3 / iOS / Store / partnership docs under `docs/ai/`
- Untracked `app/sandbox/`, `lib/sandbox/`, `lib/android/`, provider-contract files, `scripts/sandbox/`
- Probe logs, nested `worktrees/_pc2_*`
- stash `stash@{0}: On office/pc2-a3-ready: pc2-a3-pre-audit-temp` — not popped

Gitignored (survive reboot on disk): checkout-local `.env.local` files pointing at `127.0.0.1:54321`. Do not commit. Do not print keys.

---

## Exact next-morning first actions

See `docs/ai/PC2_2026_09_01_RESUME.md`.

Short form:

1. Boot Windows. Start Docker Desktop. Confirm WSL Ubuntu `giga_store`.
2. Confirm local Supabase `127.0.0.1:54321` (start if needed; **no `--linked`**).
3. Read the finished review report. Accept `SOURCE_PASS_MIGRATION_HOLD`.
4. Do **not** re-gate UM Life / comms / candidate unless `origin/alpha-0.2` moved.
5. Next named gate = `CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO` — only with owner GO. Read-only remote `schema_migrations` first. New unique versions. Then a **separate** source-merge GO. Then a **separate** targeted migration GO. Then a **separate** deploy GO.
6. Keep `75b3896c` in the source package. Keep `0f89d449` off every shared line.
