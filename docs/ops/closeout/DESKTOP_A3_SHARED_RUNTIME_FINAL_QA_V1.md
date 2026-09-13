# DESKTOP_A3_SHARED_RUNTIME_FINAL_QA_V1

DATE = 2026-08-15  
DEVICE = DESKTOP  
TASK_ID = DESKTOP_A3_SHARED_RUNTIME_FINAL_QA_V1  
OWNER = SHARED PLATFORM RUNTIME / ACCESSIBILITY / PERFORMANCE  
MODE = EVIDENCE_ONLY / NO_SOURCE_FIX / NO_SERVER_DEPLOY

## Immediate return

```
TASK_ID = DESKTOP_A3_SHARED_RUNTIME_FINAL_QA_V1
STATUS = COMPLETE_EVIDENCE / REGRESSIONS_OPEN
PRODUCTION_SHA = b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089
WIDTHS_TESTED = 360,390,430,768,1024,1440
NAVIGATION = PASS_WITH_P1_CHROME_CLIP
AUTH_SHELL = PASS_RENDER / LOGIN_REDIRECT_FAIL
PROFILE = PARTIAL (/profile → /settings, not public profile)
WATCH = PASS_SHELL / P1_HYDRATION / MEDIA_LOADING
SEARCH = PASS
CREATE = PASS_AUTHED_CHOOSER / GUEST_REDIRECT_OK / P1_HEADER_OVERLAP
MESSAGES = PASS_AUTHED_EMPTY / GUEST_REDIRECT_OK / P2_COPY
SAVED_REPRO = YES (save count moves; /saved stays empty)
FOLLOW_REPRO = YES (Follow does not become Following)
LOGIN_REDIRECT_REPRO = YES (auth 200; stays on /login; not Profile)
BETA_WORDING_REPRO = النسخة التجريبية ABSENT; Beta ABSENT; Alpha 0.2 PRESENT on /welcome
START_EXPLORING_REPRO = YES (ابدأ الاستكشاف → /watch, not /discover→/)
DELETE_MENU_REPRO = NOT_REPRO_NO_OWNER_CONTROL
RUNTIME_ERRORS = Watch React #418 x8; guest UserMenu auth-missing; no app crash
ACCESSIBILITY = P1 auth-field focus; P2 no skip-link; labels otherwise OK
RTL_LTR = PASS_SHELL (html lang/dir switch; overflowX 0)
PERFORMANCE = targeted only; home TTFB 458ms; watch TTFB 1065ms; welcome 508KB
P0 = none evidenced
P1 = login-stuck, follow, saved, start-exploring, chrome clip, auth focus, Watch #418, /profile→settings
P2 = skip-link, UserMenu console, welcome WebGL, 404 EN, messages typo, crumb unlabeled
SOURCE_CHANGES = none
BLOCKERS = Browser MCP tab vanish (Playwright used). No owner delete control on store-qa.
CENTRAL_ACTION_REQUIRED = YES (Server Wave 2 owns the user-reported items)
```

## Summary

Live production QA of `https://umtuba.com` on 2026-08-15. Production is up (HTTP 200). Operator-stated `PRODUCTION_SHA = b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089` / `PRODUCTION_RELEASE = b3fd0d0-20260815122211` matches fetched `origin/alpha-0.2`. SHA string is **not** present in HTML/headers (`PRODUCTION_SHA_PROOF = ORIGIN_TIP_MATCH`, not in-page).

Browser MCP tabs were empty; navigate refused (`UNAVAILABLE_TAB_VANISH`). Evidence collected with Playwright Chromium against production. No fabricated PASS.

**No source changes.** Prior uncommitted P1 delta on `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3-SHARED-QA` was **not** treated as live and was **not** deployed. Server Wave 2 owns implementation of the user-reported items. Desktop did not implement conflicting fixes and did not restart/deploy the external server.

**FINAL VERDICT = REGRESSIONS_OPEN.** Shared shells render. Four user-reported items reproduce. Delete-menu clipping could not be opened (no owner control for the QA account).

## Authority

| Field | Value |
| --- | --- |
| PRODUCTION_URL | `https://umtuba.com` |
| PRODUCTION_SHA | `b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089` |
| PRODUCTION_RELEASE | `b3fd0d0-20260815122211` |
| origin/alpha-0.2 after fetch | `b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089` |
| BROWSER_MCP | UNAVAILABLE_TAB_VANISH |
| EVIDENCE | `docs/ops/closeout/a3-shared-final-qa/` (this worktree) |
| AUTH_FIXTURE | `store-qa@umtuba.com` / `storeqa` (password not printed) |
| FIX_WORKTREE_PRIOR | `worktrees/DESKTOP-A3-SHARED-QA` @ `3bc0b95` dirty — **NOT THIS PRODUCTION** |
| THIS_WORKTREE | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3-SHARED-FINAL-QA` @ `b3fd0d0` clean of product edits |
| MAIN_CHECKOUT | dirty docs WIP preserved; not used for product edits |
| A1 / A2 / seller A3 | untouched |

## Method

1. Read `PROJECT_STATE.md` / `CURRENT_TASK.md` (stale `SHUTDOWN_SAFE`; this GO honored instead).
2. `git fetch --prune`. `origin/alpha-0.2` = production SHA. Did **not** FF dirty main or dirty SHARED-QA.
3. Created clean worktree `DESKTOP-A3-SHARED-FINAL-QA` from `origin/alpha-0.2`.
4. Playwright guest matrix at 360/390/430/768/1024/1440.
5. RTL via `umtuba_locale=ar`.
6. Keyboard/focus on login@390 and home@1440.
7. Authenticated probe with Store QA after login API succeeded.

Scripts (no secrets written):

- `docs/ops/closeout/a3-shared-final-qa/run-prod-final-qa.mjs`
- `docs/ops/closeout/a3-shared-qa/run-prod-final-qa-retry.mjs` (run from main `node_modules`)
- `docs/ops/closeout/a3-shared-qa/run-prod-final-qa-authed-probe.mjs`

JSON:

- `a3-shared-final-qa/prod-final-qa-evidence.json`
- `a3-shared-final-qa/prod-final-qa-retry.json`
- `a3-shared-final-qa/prod-final-qa-authed-probe.json`

Shots: `a3-shared-final-qa/shots/` (inside repo/worktree, not Windows Desktop).

## Widths / navigation / shells

### Guest pages @1440

| Surface | HTTP | Final URL | overflowX | notes |
| --- | --- | --- | --- | --- |
| `/` | 200 | `/` | 0 | Primary nav Home/World/Learning/Live/Messages; section shortcuts include Create |
| `/login` | 200 | `/login` | 0 | AuthShell; copy says continue to Profile |
| `/signup` | 200 | `/signup` | 0 | AuthShell |
| `/search` | 200 | `/search` | 0 | labelled search field |
| `/welcome` | 200 | `/welcome` | 0 | landing; headerOverflow 164; Alpha 0.2 badge |
| `/watch` | 200 | `/watch` | 0 | videos present; “Loading video…” |
| `/discover` | 200 | `/` | 0 | alias → Home (source contract) |
| `/support` | 200 | `/support` | 0 | crumb nav unlabeled |
| `/create` guest | 200 | `/login?next=%2Fcreate` | 0 | correct auth gate |
| `/messages` guest | 200 | `/login?next=%2Fmessages` | 0 | correct auth gate |
| `/profile` guest | 200 | `/login?next=%2Fprofile` | 0 | correct auth gate |
| bogus route | **404** | — | 0 | English “This page could not be found.” |

### Responsive (overflowX always 0)

Document horizontal scroll is **0** at every tested cell. **headerOverflow** (clipped chrome, not page scroll) is still live:

| width | `/` | `/search` | `/watch` | `/welcome` | `/login` |
| --- | --- | --- | --- | --- | --- |
| 360 | 217 | 71 | 102 | 150 | 0 |
| 390 | 187 | 41 | 72 | 125 | 0 |
| 430 | 147 | 1 | 32 | 103 | 0 |
| 768 | 335 | 98 | 0 | 97 | 0 |
| 1024 | 79 | 0 | 0 | 122 | 0 |
| 1440 | 0 | 0 | 0 | 164 | 0 |

≤430: desktop Primary hidden, Primary mobile visible. ≥768: desktop Primary visible, mobile hidden. Contract OK.

Authed @390: Create / Saved / Messages / Settings headers **overlap** (logo vs Back/Discover/Search). Same chrome-density class as prior undeployed SHARED-QA fix.

### NAVIGATION

- Desktop primary: Home, World, Learning, Live, Messages — visible @1440.
- Mobile bottom: Home, Live, Messages, Profile — visible ≤430.
- Guest Create / Messages / Profile / Saved gate to login with `next=`.
- `/discover` full navigation → `/` (Home). Client `ابدأ الاستكشاف` does **not** follow that path (see regressions).

### AUTH_SHELL

Renders. Email/password labelled. Language select labelled. No Beta wording on login.

Login copy: “Continue to your Profile, or wherever you left off.” Default `getSafeRedirectPath(..., APP_ROUTES.profile)` = `/profile`.

**Successful Store QA sign-in does not leave `/login`.** Supabase `auth/v1/token` + `auth/v1/user` both **200** (twice). No alert. Button stays “Sign in”. `navHops` stay on `/login`. Session **does** exist: a later `goto /profile` is authenticated. See LOGIN_REDIRECT_REPRO.

### PROFILE

After session exists, `GET /profile` landed on **`/settings`** (Profile tab: display name “UMTUBA Store QA”, username `storeqa`). Source says bare `/profile` should redirect to username profile when username exists, else Settings. Username is present in the settings form, so the public-profile resolver failed or `getProfileByIdFromDb` threw and fell through. **Not** `/profile/storeqa`.

### WATCH

Shell + action rail + Follow + Save render. Persistent “Loading video…”. After save: “Playback link expired. Retry playback”. React minified **#418** hydration ×8 (pageerror). Guest and authed.

### SEARCH

200. Filters All/People/Videos/Stories/Stores/Products. Input labelled. overflowX 0.

### CREATE

- Guest → `/login?next=/create`.
- Authed → chooser: Video / Article / Write Post. Usable.
- @390 header: UMTUBA overlaps “Back to Home”.

### MESSAGES

- Guest → `/login?next=/messages`.
- Authed → empty inbox. Copy typo: “Text text messaging only — no attachments or voice yet.”
- @390 header logo overlap.

## User-reported regressions (evidence only)

### SAVED_REPRO = YES

Authed Watch: Save control visible. After click, rail save count on the first clip went **1 → 2**. Then `/saved` still: **“No saved posts yet”**. Shot: `shots/probe-saved-page.png`.

### FOLLOW_REPRO = YES

Authed Watch: Follow visible on `@marenapost` and `@mohamad`. After clicking Follow on the first creator, **no “Following”** appeared. First Follow control disappeared (ellipsis only); second video still “FOLLOW”. Shot: `shots/probe-follow-after.png`. Stayed on `/watch` (not bounced to login).

### LOGIN_REDIRECT_REPRO = YES

| Step | Result |
| --- | --- |
| Fill Store QA email/password | emailLen 19, passwordLen 28 |
| Submit | `auth/v1/token` 200, `auth/v1/user` 200 |
| Leave `/login` | **NO** |
| Land `/profile` | **NO** |
| Alerts | none |
| Session after manual navigation | **YES** (`/create`, `/messages`, `/saved`, `/watch` authed; `/profile` → `/settings`) |

Expected destination per login source + on-page copy = **Profile**. Observed = **stuck on login**; even manual `/profile` → **Settings**, not public profile.

### BETA_WORDING_REPRO

| Needle | `/` | `/welcome` | `/login` | `/discover→/` | `/watch` |
| --- | --- | --- | --- | --- | --- |
| `النسخة التجريبية` | absent | absent | absent | absent | absent |
| `تجريبية` | absent | absent | absent | absent | absent |
| `Beta` | absent | absent | absent | absent | absent |
| `Alpha 0.2` / `ألفا 0.2` | absent | **present** | absent | absent | absent |

Join CTA is “Join UMTUBA” / “انضم إلى أم طوبا” (not Join Beta). Legal metadata still mentions “Beta soft launch” in source; not re-audited as visible body copy this pass.

### START_EXPLORING_REPRO = YES

Arabic `/welcome`, exact button `ابدأ الاستكشاف` (ctaCount=1).

Hops: `/welcome` → `/welcome` → **`/watch`**.

`landedDiscover = false`. Source at this SHA: `router.push(APP_ROUTES.discover)` and `/discover` aliases **Home `/`**. Observed destination is **Watch**, not Home. Shots: `retry-start-exploring.png`, `start-exploring-after.png`.

### DELETE_MENU_REPRO = NOT_REPRO_NO_OWNER_CONTROL

`More actions` count = 0 on Watch and Profile for `storeqa` (does not own the visible clips). Confirm dialog was **not** opened. No delete performed.

Source still positions the owner menu inside Watch `overflow-hidden` stage (`WatchExperience` + rail `bottom-[calc(100%+…)]`). Clip **risk** remains; **not** claimed reproduced.

## Runtime / a11y / RTL / perf

### RUNTIME_ERRORS

- **pageerror:** React `#418` on `/watch` ×8. Not a white-screen crash.
- **console.error:** `[UserMenu] getUser failed: Auth session missing!` on guest Home/Search/Watch — expected guest, still noisy.
- **requestfailed:** Next `_rsc` abort + signed video `ERR_ABORTED` during rapid nav. Not treated as P0 app failures.
- Welcome: THREE.Clock deprecated + headless WebGL software fallback / GPU stall.

### ACCESSIBILITY

- Skip link **absent** on all tested surfaces. P2.
- Login email/password: `outlineWidth 0`, `boxShadow none` (border-color-only). P1 (same as prior undeployed SHARED-QA).
- Keyboard login@390 reaches UMTUBA, language, email, password, forgot, Sign in, Create one.
- Keyboard home@1440: branded home + primary links, 2px outline.
- No unlabeled buttons/links on tested guest shells. Inputs labelled.
- Support crumb `<nav>` aria-label null. P2.

### RTL_LTR

Cookie `umtuba_locale=ar`: `html lang=ar dir=rtl` on home 390, login 390, welcome 390. overflowX 0. Mobile nav labels Arabic (`الرئيسية`, `مباشر`, `الرسائل`, `الملف`). Welcome badge `ألفا 0.2`. Mixed EN content on Watch overlays (Follow, Untitled video, Post Journey).

### PERFORMANCE (targeted)

| Page | TTFB ms | FCP ms | load ms | transfer KB |
| --- | --- | --- | --- | --- |
| home | 458 | 660 | 969 | 3 |
| login | 108 | 407 | 252 | 4 |
| search | 147 | 217 | 250 | 36 |
| welcome | 106 | 363 | 328 | **508** |
| watch | **1065** | 1440 | 0 | 1 |
| discover alias | 2875 | 3042 | 2998 | 3 |
| profile guest (login) | 1047 | 1120 | 1075 | 7 |

No expensive Lighthouse. Watch TTFB + persistent loading + expired playback link is the only current media/perf concern. Home first-hit is acceptable vs prior 4s cold sample. Welcome transfer 508 KB unchanged class.

## Issues

### P0

None evidenced (site up, no white-screen, session can be used if the user navigates away from login).

### P1

1. **Login does not leave `/login` after successful auth** — token/user 200; UI stays on login; not Profile. Server Wave 2.
2. **Follow does not become Following** on Watch. Server Wave 2.
3. **Save does not populate `/saved`** (rail count can increment). Server Wave 2.
4. **`ابدأ الاستكشاف` → `/watch`** instead of `/discover` → Home. Server Wave 2.
5. **`/profile` → `/settings`** for Store QA even though username `storeqa` is set. Public profile resolver miss.
6. **Auth field focus** still outline-none (prior SHARED-QA fix **not** on this production).
7. **Mobile/tablet top chrome clip / overlap** (headerOverflow 79–335; authed Create/Saved/Messages overlap). Prior SHARED-QA fix **not** on this production.
8. **Watch React #418** hydration pageerrors.

### P2

1. Missing skip link.
2. Guest UserMenu `console.error` Auth session missing.
3. Welcome headerOverflow + 508 KB + WebGL stalls (welcome owner).
4. 404 not localized.
5. Messages copy “Text text messaging only”.
6. Support / legal crumb nav unlabeled.
7. Persistent Watch “Loading video…” / playback link expired (media).

## SOURCE_CHANGES

**none.** No product files edited. No commit. No push. No Desktop deploy. No Learning/Store redesign. No duplicate of Server Wave 2 implementation.

Worktree contains this closeout + Playwright evidence only.

## Central action required

YES. Server Wave 2 owns:

- login leave + Profile destination
- Follow → Following
- Saved persistence
- `ابدأ الاستكشاف` routing
- (optional verify) owner delete-menu clipping on an account that owns a video

Desktop can re-verify after Central lands those items on this SHA’s successor. Do not treat `DESKTOP-A3-SHARED-QA` uncommitted a11y delta as a fix for the user-reported items.

## Open issues

- Browser MCP unusable this session (known tab vanish).
- Delete-menu clipping unproven (need an owner account / own video).
- Production SHA not stamped in HTML.
- Store QA `/profile` resolver → settings (may be the same family as login destination).
