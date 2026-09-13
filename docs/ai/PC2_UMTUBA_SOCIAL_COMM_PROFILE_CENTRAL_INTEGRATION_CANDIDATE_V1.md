# PC2 Central integration candidate — UM Life + Communications + Rich Profile

```text
TASK_ID = PC2_UMTUBA_SOCIAL_COMM_PROFILE_CENTRAL_INTEGRATION_CANDIDATE_V1
STATUS = LOCAL_CANDIDATE_READY
TODAY = 2026-08-31
PRIMARY_TARGET = LOCAL
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
PUSH = NO
MERGE_TO_SHARED = NO
READY_FOR_CENTRAL_REVIEW = YES
READY_FOR_PUSH = NO
READY_FOR_DEPLOY = NO
CENTRAL_AUTHORITATIVE_BASE_REF = origin/alpha-0.2
CENTRAL_AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
CANDIDATE_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-central-integration-candidate-v1
CANDIDATE_BRANCH = pc2/umtuba-social-comm-profile-central-integration-candidate-v1
CANDIDATE_SHA = 814226776ced7325b174665f773906e163efcb2d
CANDIDATE_PARENT = b5fbeff29cb0f308481b38c06500c572cd44a9c4
UPSTREAM = UNSET
DISCOVERY_NOT_FOUND_CHOICE = b67a7b33
LOCAL_BOOTSTRAP_0F89D449_INCLUDED = NO
MIGRATION_DECISION_REQUIRED = YES
LOCAL_API = http://127.0.0.1:54321
LOCAL_APP_URL = http://localhost:3002
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
```

## What Central should review

One local-only commit on a new worktree branched from current Central `origin/alpha-0.2` @ `b5fbeff2`:

`814226776ced7325b174665f773906e163efcb2d` — `feat(web): integrate UM Life, communications, and rich profile onto central`

Review the diff `b5fbeff2..81422677`. Do **not** push this branch. Do **not** merge to `alpha-0.2` / main / shared without a separate Central GO. Do **not** treat the dirty comms checkout or the UM Life worktree as the integration base.

## Central base identification

Inspected remotes after `git fetch origin --prune`.

| Check | Result |
| --- | --- |
| `origin/central` exact branch | Does not exist (only `origin/central/*` feature refs) |
| `origin/HEAD` | `origin/alpha-0.2` |
| Current Central web tip | `origin/alpha-0.2` = `b5fbeff29cb0f308481b38c06500c572cd44a9c4` (`fix(welcome): remove Alpha 0.2 and Join Beta labels.`) |

None of `a04cc4a8`, `09155b15`, `196a0358`, `b67a7b33`, `d84dbda5`, `866749ed`, `0f89d449` are ancestors of that tip. Central already had Phase 1 `/life` (`LifeExperience`), Messages without an `I18nProvider` wrap, evolved Creator Space profile, `nav.life` = "UM Life", and Home circles that include `/life`. Central did not have communications actions, Start conversation, rich-profile editor/schema, or `20260915` / `20260916`.

## Worktree

Created clean worktree:

`C:\Users\Giga store\Desktop\umtuba\umtuba-web-central-integration-candidate-v1`

Local-only branch `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` from `origin/alpha-0.2`. Upstream unset. The proven UM Life worktree `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-09155b15` was not modified (`HEAD` still `09155b158228df7b5523d2388a53a02481f98726`).

## discoveryNotFound decision

**Choice = `b67a7b33`** (shared helper + regression test). **Not** `d84dbda5`.

Why this is authoritative for the candidate:

- Correct Next.js 16 Server Actions semantics: no synchronous export from a `"use server"` module
- Least semantic change from the original `1abfb94d` helper (`lib/comms/discoveryNotFound.ts` is client-safe)
- Preserves generic privacy copy (`No UMTUBA account is available to message with this lookup.`) so missing / nobody / unverified stay indistinguishable
- Has `lib/content/communicationsDiscovery.v1.test.ts`
- Avoids a second inline helper in `app/actions/communications.ts`

`d84dbda5` remains a valid local compile fix on the dirty comms checkout, but it inlined `t("comms.notFound")` and removed the shared helper. XOR loser for this candidate.

## Integration method

Cherry-pick of the rich-profile / comms tips onto current alpha was aborted after heavy conflicts (profile, settings, i18n, docs). Product files were checked out from proved SHAs and wired onto Central surfaces. No `-n` leftover index. `0f89d449` files were not brought in.

| Input | Disposition |
| --- | --- |
| Rich profile `3d6ed0eb` / `c4f0fbfc` new files | Integrated (editor, contract, `richProfile.ts`, tests, `20260915`) |
| Comms `866749ed` + `b67a7b33` new files | Integrated (actions, discovery UI, privacy panel, `/u/[username]`, `20260916` original) |
| `a04cc4a8` UM Life nav modules | Integrated (`UmLifeIcon`, `umLifeHomeEntry`) |
| `09155b15` `/life` alias + Home entry behavior | Preserved in candidate wiring; SHA not cherry-picked wholesale |
| `196a0358` Messages `I18nProvider` wrap | Included on Central’s Messages page |
| `d84dbda5` | Skipped (XOR vs `b67a7b33`) |
| `4d4953d8` HomeSocialComposer | Skipped (would fight Central Home/Discover) |
| `09155b15` wholesale PageProps rewrite | Skipped (Central already uses Promise searchParams on many pages) |
| `0f89d449` | **Excluded** |

## Product behavior preserved

### UM Life

- First-class UM Life chrome on desktop and mobile-web
- One-tap lands on `/` (video-first social Home)
- `/life` aliases to `/` (307), query preserved
- No second Facebook-style feed
- Central Home / World / Learning / Live / Messages chrome kept
- Compose stays on Central Create / existing Home (HomeSocialComposer not ported)

### Communications

- Start conversation + username/email/phone/link discovery
- Generic not-found helper
- 1:1 open + send/read proved locally
- Settings `CommunicationsPrivacyPanel`
- `/u/[username]` + `/@handle` rewrite
- Messages SSR wrapped in `I18nProvider`

### Rich Profile

- Approved editor + contract + `20260915`
- About tab maps rich sections (including places)
- Cover upload / `profileCovers` **not** ported (would fight Central Settings)
- Cross-user owner Save/Edit controls hidden

## Migrations

New vs Central (version numbers were free on `b5fbeff2`):

- `supabase/migrations/20260915_rich_personal_profile_foundation_v1.sql`
- `supabase/migrations/20260916_communications_identity_discovery_v1.sql`

`20260916` is the **production-intended original** (`on conflict (user_id)`). It is **not** the `0f89d449` `on conflict on constraint …_pkey` rewrite. No historical filename uniquification. No posts precursor.

**MIGRATION_DECISION_REQUIRED = YES**

Central must decide when/how to apply `20260915` + `20260916` on hosted. If a fresh local apply still needs the constraint-target form for product correctness, that must be a **new additive migration**, not a silent history rewrite and not `0f89d449`.

This candidate did **not** run `supabase db push` / `--linked`. Local DB already had these tables from the earlier comms checkout apply.

## Local gate

- Checkout-local gitignored `.env.local` (local URL + local publishable key). Not committed. Shared `.env` not touched.
- Next.js `npm run dev -- --port 3002` — `http://localhost:3002` (`Environments: .env.local`)
- Playwright + system Chrome (IDE browser flaky in prior PC2 gates)
- Local TEST_USER_A / TEST_USER_B only. Passwords not printed.
- Hosted interceptor: `*.supabase.co` / `tgucwnjwoyeqoxqaxmew` = 0; local `127.0.0.1:54321` = 139

| Surface | Result |
| --- | --- |
| TypeScript `npx tsc --noEmit` | PASS |
| Build `npm run build` | PASS (Next.js 16.2.11) |
| HOME | PASS (UM Life chrome) |
| WATCH | PASS |
| UM_LIFE alias `/life` → `/` | PASS (307) |
| UM_LIFE one-tap | PASS |
| MESSAGES + I18n SSR | PASS |
| COMM_DISCOVERY | PASS (`@testuserb`) |
| COMM_1TO1 | PASS |
| COMM_SEND_READ | PASS |
| COMM_AUTHZ | PASS (signed-out Messages redirect; no cross-user profile editor). Full email/phone nobody matrix + decoy-thread secret not re-run on this chrome. |
| RICH_PROFILE | PASS |
| RICH_PROFILE_PRIVACY | PASS |
| LEARNING | PASS |
| STORE | PASS |
| HOSTED_SUPABASE_REQUESTS_OBSERVED | NO |

Targeted vitest: `umLifeHomeEntry`, `communicationsDiscovery.v1`, `richPersonalProfile.v1`, `platformNavContract` — PASS after adapting the UM Life test to Central user-menu (Messages lives in primary nav, not `userMenuItems`).

## Diff vs Central

`git diff --stat origin/alpha-0.2` = 63 files, +9719 / −158. Intended product + i18n keys + two new migrations only. No `.env`, no `0f89d449` precursor/renames, no recovery artifacts.

`git diff --check` exit 0 on the candidate commit.

## What must not be pushed

- This candidate branch (until a separate Central GO)
- Comms checkout `0f89d449`, `d84dbda5`, `196a0358`
- Any historical migration filename uniquification
- `.env.local` / keys
- Untracked gate script `scripts/_pc2_central_integration_candidate_gate.mjs` (left untracked in the candidate worktree)

## Residuals

1. Central Phase 1 `/life` modules (`LifeExperience`, etc.) remain on disk; `app/life/page.tsx` is now the 09155b15 alias.
2. Home and UM Life both highlight on `/` (shared destination).
3. Cover upload / `profileCovers` not ported.
4. HomeSocialComposer (`4d4953d8`) not ported.
5. Full comms privacy matrix (email/phone nobody, decoy thread) not re-automated here; actions + original `20260916` are the proved implementations.
6. CLI may still be linked to hosted `tgucwnjwoyeqoxqaxmew`. Never `--linked` / `db push`.
7. Comms checkout remains dirty/historical. Leave it.
8. UM Life worktree remains untouched at `09155b15`.

## Central handoff

Review `81422677` on `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` vs `origin/alpha-0.2` @ `b5fbeff2`. Accept `b67a7b33` discoveryNotFound. Apply `20260915` + original `20260916` only with an explicit Central migration GO. Do not replay `0f89d449`. Do not push or merge this branch from this task.
