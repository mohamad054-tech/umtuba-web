# PC2 UM Life authoritative local integration + compatibility gate

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_AUTHORITATIVE_LOCAL_GATE_V1
STATUS = LOCAL_GATE_PROVED
PRIMARY_TARGET = LOCAL
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
PUSH = NO
MERGE = NO
UM_LIFE_BRANCH = pc2/umtuba-um-life-home-entry-v1
UM_LIFE_SHA_VERIFIED = 09155b158228df7b5523d2388a53a02481f98726
UM_LIFE_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-09155b15
LOCAL_API = http://127.0.0.1:54321
LOCAL_APP_URL = http://localhost:3001
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
UM_LIFE_FIX_COMMIT = NONE
```

## Method

Separate detached worktree at exact SHA `09155b158228df7b5523d2388a53a02481f98726` (not the dirty comms checkout, not the existing tip worktree at `ab3f7b03`).

`git rev-parse HEAD` in that worktree = `09155b158228df7b5523d2388a53a02481f98726`.

Local Supabase already running (WSL Docker, no `--linked`). Auth health HTTP 200 at `http://127.0.0.1:54321/auth/v1/health`. Studio HTTP 307 at `http://127.0.0.1:54323`.

`.env*` is gitignored (`.gitignore:41`). Checkout-local `.env.local` copied from comms (URL `127.0.0.1:54321` + local publishable key only). `NEXT_PUBLIC_SITE_URL=http://localhost:3001`. Not committed. Shared `.env` not touched.

`cursor-ide-browser` could create a tab then lost it (`No browser tab available` / `Browser view not found`). Product proof used Playwright + system Chrome against live `npm run dev -- --port 3001` (`Environments: .env.local`). Network interceptor on every request: hosted `*.supabase.co` / `tgucwnjwoyeqoxqaxmew` counted; local `127.0.0.1:54321` counted.

TEST_USER_A only. Password reset via local Auth admin JWT minted from the Auth container secret. Values not printed.

## Historical SHAs (verified, not used as replacements)

| Label | SHA | Relation |
| --- | --- | --- |
| Authoritative product (this gate) | `09155b158228df7b5523d2388a53a02481f98726` | Exact checkout |
| `UM_LIFE_WEB_DOCS_TIP` | `ab3f7b03dcafe8bc70d96b4641e4cdc3188b5bcf` | One docs stamp after product SHA (`docs(ai): stamp um life build gate and pageprops sha`). Ancestor check: `09155b15` is ancestor of `ab3f7b03`. |
| `UM_LIFE_FINAL_MOBILE_SHA` | `4d07bd6c0eca5514a2e4df139203d929c9943b68` | Present locally. Not exercised (web gate only). |

Existing worktree `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-home-entry-v1` remains on branch tip `ab3f7b03` and was not reused.

## Product behavior (click-through)

`/life` is a forever alias to `/` (same `HomeFeedLoader` → `DiscoverExperience`). Destination is video-first Home, not a second Facebook-like feed. Composer is `HomeSocialComposer` + `CreatePostModal` (`Post to UM`).

| Gate | Result | Evidence |
| --- | --- | --- |
| HOME_UM_LIFE_ENTRY | PASS | Home primary chrome includes UM Life. Accessible name is `UM Life, social home` (`nav.umLifeAria`). Exact `^UM Life$` misses; `/UM Life/i` matches. Other primaries: Watch, Create, Learning, Store. |
| ONE_TAP | PASS | Click UM Life lands on `/`. |
| LIFE_ROUTE | PASS | `GET /life` → 307 → `/` status 200. |
| LIFE_FEED | PASS | Home/alias renders Discover feed chrome + `Share on UM`. No load error. |
| LIFE_COMPOSE | PASS | Write + Photo buttons present. Modal title `New UM post`. |
| LIFE_TEXT_POST | PASS | Signed-in A published unique text marker. `Posted on UM` toast + marker visible. |
| LIFE_IMAGE_POST | PASS | Photo compose + 1×1 PNG + caption. Marker + image + toast visible. |
| LIFE_POST_DETAIL | PASS | In-place latest-post layer after publish. `/life?post=<id>` aliases to `/?post=<id>` (query preserved). No dedicated `/post/[id]` route — `NOT_IMPLEMENTED` as a separate page; implemented as latest layer + `?post=` video/home focus. |
| LIFE_PROFILE_NAV | PASS | First-pass `/profile\|profile/i` matcher hit the wrong control (stayed on `/`). Recheck: `Open on your profile` → `/profile/testusera`. Direct `/profile/testusera?tab=all` shows owner. |
| HOME_REGRESSION | PASS | After flows, `/` still has UM Life entry. |
| WATCH_REGRESSION | PASS | `/watch` HTTP 200, Watch surface intact. |
| FACEBOOK_CLONE | PASS | No Facebook/Meta clone chrome. Brand remains UMTUBA / UM Life / video-first Home. |
| HOSTED_SUPABASE | NO | Final pass: hosted 0, local 135. Profile recheck: hosted 0, local 80. |

Login: `signInWithEmail` + `claimPendingReferralAction` succeeded (dev server). Playwright often still saw `/login?next=/` until a hard `goto /` (Next `router.push` + `router.refresh`). Session cookies then showed `@testusera` in header. Not treated as a UM Life source defect.

## Compatibility (no merge)

Merge-base = `866749ed76ac1975deeceeb73dfa42c333ed05bd` (comms Part 1b).

### Commits in comms HEAD `196a0358` not in UM Life

- `05b100f0` docs(ai): 2026-08-30 end of day preservation
- `d354fd2f` docs(ai): record 2026-08-30 remote backup push results
- `0f89d449` fix(local-supabase): bootstrap posts precursor and uniquify colliding local migration versions **LOCAL-ONLY — DO NOT PUSH**
- `d84dbda5` fix(comms): do not export a sync helper from the server-actions module **LOCAL-ONLY — DO NOT PUSH**
- `196a0358` fix(comms): wrap Messages SSR tree in I18nProvider **LOCAL-ONLY — DO NOT PUSH**

### Commits in UM Life SHA not in comms HEAD

- `a04cc4a8` feat(nav): first-class um life home entry
- `b67a7b33` fix(comms): server-action boundary for discovery not-found
- `09155b15` fix(web): next16 pageprops searchparams contract

### Overlap files (changed on both sides from merge-base)

| File | Life | Comms | Notes |
| --- | --- | --- | --- |
| `app/actions/communications.ts` | `b67a7b33` deletes sync export | `d84dbda5` deletes same export | Trees now **identical** (`git diff` empty). |
| `app/messages/components/StartConversationPanel.tsx` | imports `lib/comms/discoveryNotFound` | uses `t("comms.notFound")` | **Conflict — Central picks one.** |
| `docs/ai/CURRENT_TASK.md` | pageprops/UM Life task | comms/local gates | Docs only. |
| `docs/ai/CURSOR_REPORT.md` | pageprops/UM Life | comms/local gates | Docs only. |

### Non-overlap (selected)

- **Profile components:** none vs merge-base on either side. Rich Profile already lives on `866749ed`.
- **Home/nav:** life-only (`app/life/page.tsx`, `umLifeHomeEntry.ts`, `UmLifeIcon.tsx`, `AppTopNav`, `AppMobileBottomNav`, `routes.ts`, i18n UM Life keys).
- **Messages page:** comms-only `196a0358` I18nProvider wrap. Life did not touch `app/messages/page.tsx`.
- **PageProps:** life-only 66 App Router pages.

### Environment assumptions

Both trees read `NEXT_PUBLIC_SUPABASE_URL` + publishable/anon key via `lib/env/supabasePublic.ts`. UM Life ran on `http://127.0.0.1:54321` + local publishable key. Same local test users. No service-role in the Next app.

### Schema assumptions

UM Life `createPost` inserts `public.posts` with `user_id`, `saves`, `views`, `video_*`. Local stack already has that shape because comms `0f89d449` added a **local-only** `CREATE TABLE IF NOT EXISTS public.posts` precursor (hosted table was created in dashboard, never in git). Later committed migrations add the remaining columns. Production already has `posts` — precursor must not be replayed.

## Integration plan (do not execute in this task)

### A. Clean non-overlapping

- `a04cc4a8` UM Life nav + `/life` alias + i18n + icon (onto comms line).
- `09155b15` Next 16 PageProps (onto comms line, after `a04cc4a8` so `app/life/page.tsx` exists).
- `196a0358` Messages I18nProvider (onto UM Life line; no file clash with life product).
- Docs-only `05b100f0`, `d354fd2f`.

### B. Conflicts requiring Central

1. **discoveryNotFound style:** `b67a7b33` (`lib/comms/discoveryNotFound.ts` + test) vs `d84dbda5` (inline `t("comms.notFound")`). Same compile fix, different API. Do not cherry-pick both.
2. **`20260916_communications_identity_discovery_v1.sql`:** comms rewrote `ON CONFLICT (user_id)` → `ON CONFLICT ON CONSTRAINT …_pkey` for local apply. Same version number. Do not treat as a new production migration.
3. **Handoff docs** (`CURRENT_TASK.md`, `CURSOR_REPORT.md`) — expected; Central owns the surviving copy.

### C. Safe cherry-pick candidates (list only — not done)

| SHA | Direction | Why safe |
| --- | --- | --- |
| `a04cc4a8` | → comms checkout | Nav/life only; no comms/profile rewrite |
| `09155b15` | → comms checkout | Type-only PageProps after nav |
| `196a0358` | → UM Life worktree | Messages page only |
| `b67a7b33` **or** `d84dbda5` | one side only | Equivalent server-action fix |

Do **not** cherry-pick `0f89d449` onto production or onto UM Life as a “product” commit.

### D. Migrations that must NOT be replayed

- `supabase/migrations/20260711_local_bootstrap_posts_table_precursor_v1.sql` — local reconstruct of dashboard-era `posts`. Hosted table already exists.
- Renames in `0f89d449` (`20260713_*.sql` → `2026071300000N_*.sql`, same for 20260714 / 20260727–29 / 20260805). Content unchanged (`R100`). Replaying both names would double-apply.
- In-place `20260916` conflict-target edit — local Postgres compatibility only.
- `supabase/seed.sql` touch from `0f89d449`.

### E. Recommended final integration order

1. Keep `866749ed` as shared ancestor. Central remains authoritative.
2. Central picks discoveryNotFound: prefer life `b67a7b33` (shared helper + test) **or** keep comms inline; apply the loser as a no-op.
3. Cherry-pick `a04cc4a8` then `09155b15` onto the Communications + Rich Profile line (or merge-direction equivalent).
4. Keep `196a0358` on the comms line; cherry-pick it onto UM Life if that branch is the survivor.
5. Leave `0f89d449` on the local comms checkout only. Never `db push` / `--linked`.
6. Re-run this UM Life gate + the comms/rich-profile gate on the combined local tree before any Central GO.
7. **This task: no cherry-pick, no merge, no push.**

## Defects

No UM Life source defect required a fix. Worktree HEAD remains `09155b15`. `UM_LIFE_FIX_COMMIT = NONE`.

## Residuals

1. CLI still linked to hosted `umtuba` / `tgucwnjwoyeqoxqaxmew`. Do not `db push` / `--linked`.
2. IDE browser flaky; Playwright used.
3. Next `router.push` after login may leave Playwright on `/login` until hard navigation; session is fine.
4. No dedicated `/post/[id]` page.
5. Mobile SHA `4d07bd6c` not exercised.
6. Do not push `0f89d449`, `d84dbda5`, `196a0358`.
7. Historical dirty/untracked files in the comms checkout left untouched.

## OUTPUT

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_AUTHORITATIVE_LOCAL_GATE_V1
STATUS = LOCAL_GATE_PROVED
UM_LIFE_BRANCH = pc2/umtuba-um-life-home-entry-v1
UM_LIFE_SHA_VERIFIED = 09155b158228df7b5523d2388a53a02481f98726
LOCAL_SUPABASE = RUNNING
LOCAL_APP_URL = http://localhost:3001
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
HOME_UM_LIFE_ENTRY = PASS
LIFE_ROUTE = PASS
LIFE_FEED = PASS
LIFE_COMPOSE = PASS
LIFE_TEXT_POST = PASS
LIFE_IMAGE_POST = PASS
LIFE_POST_DETAIL = PASS
LIFE_PROFILE_NAV = PASS
HOME_REGRESSION = PASS
WATCH_REGRESSION = PASS
UM_LIFE_DEFECTS = NONE
UM_LIFE_FIX_COMMIT = NONE
COMM_PROFILE_OVERLAP_FILES = app/actions/communications.ts; app/messages/components/StartConversationPanel.tsx; docs/ai/CURRENT_TASK.md; docs/ai/CURSOR_REPORT.md
MIGRATION_OVERLAP = 0f89d449 local precursor + uniquified renames + 20260916 conflict-target rewrite — DO NOT REPLAY
CONFLICTS_REQUIRING_CENTRAL = discoveryNotFound helper vs inline; 20260916 local ON CONFLICT rewrite; handoff docs
SAFE_INTEGRATION_CANDIDATES = a04cc4a8; 09155b15; 196a0358; b67a7b33 XOR d84dbda5
RECOMMENDED_INTEGRATION_ORDER = decide discoveryNotFound; then a04cc4a8; then 09155b15; keep 196a0358; isolate 0f89d449 local-only
PUSH = NO
MERGE = NO
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
```
