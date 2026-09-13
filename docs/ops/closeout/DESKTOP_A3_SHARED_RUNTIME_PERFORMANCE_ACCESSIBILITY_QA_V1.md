# DESKTOP_A3_SHARED_RUNTIME_PERFORMANCE_ACCESSIBILITY_QA_V1

DATE = 2026-08-15  
DEVICE = DESKTOP  
TASK_ID = DESKTOP_A3_SHARED_RUNTIME_PERFORMANCE_ACCESSIBILITY_QA_V1  
OWNER = CROSS-PLATFORM RELEASE QUALITY  
MODE = EXECUTION_FIRST / TOKEN_CONSERVATIVE

## Summary

Live production QA of shared web shell (responsive, nav, auth, loading/error, performance, keyboard/focus, labels, RTL/LTR, media, console). Browser MCP tabs vanished immediately (`UNAVAILABLE_TAB_VANISH`); evidence collected with Playwright Chromium against `https://umtuba.com`.

No prior **shared** runtime / responsive / a11y production closeout was found. Commerce buyer/seller a11y (`716bf47` / `42ae9ba`) is Store-owned and was **not** redone. Existing `worktrees/DESKTOP-A3` (seller a11y, CLEAN) was **not** touched.

`origin/alpha-0.2` advanced on fetch: `f8e142d` → **`3bc0b95554f7c59ed174903c448011632faaf4d9`**. Production `/support` HTTP 200 + title `Support | UMTUBA` matches that tip’s public support page. Local `alpha-0.2` remains stale at `32fb3629` (not FF’d). Main checkout dirty WIP preserved.

Safe shared-shell fixes implemented **uncommitted** on a new worktree from `origin/alpha-0.2` (not the seller A3 tree, not the dirty profile-hero checkout). No commit. No push.

**FINAL VERDICT = PARTIAL** — production is usable (nav/auth/RTL shell work; no P0 crash), but P1 focus + mobile chrome issues are live until Central lands the uncommitted delta.

## Authority

| Field | Value |
| --- | --- |
| SOURCE_SHA | `3bc0b95554f7c59ed174903c448011632faaf4d9` (`origin/alpha-0.2` after `git fetch --prune` 2026-08-15) |
| PRODUCTION_URL | `https://umtuba.com` |
| PRODUCTION_TESTED | **YES** (Playwright; `/`, `/login`, `/signup`, `/support`, `/account-deletion`, `/search`, `/welcome`, 404) |
| PRODUCTION_SHA_PROOF | **INFERRED** — `/support` 200 is the 3bc0b95 feature; deploy-dir SHA string not readable from HTML |
| BROWSER_MCP | **UNAVAILABLE_TAB_VANISH** — `browser_tabs` new then view gone; navigate refused |
| EVIDENCE | `docs/ops/closeout/a3-shared-qa/prod-qa-evidence.json` + `run-prod-qa.mjs` |
| FIX_WORKTREE | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3-SHARED-QA` |
| FIX_BRANCH | `office/desktop-a3-shared-runtime-a11y-qa-v1` (tracks `origin/alpha-0.2`, dirty, **no commit**) |
| EXISTING_A3_WT | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3` @ `42ae9ba` seller a11y — **untouched** |

## Prior closeouts (not redone)

- `DESKTOP_A1_COMMERCE_BUYER_SELLER_A11Y_FINAL_CLOSEOUT_V1.md` — Store buyer/seller UI contracts; CLOSED_PUSHED
- `DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1.md` — Android device; out of scope
- Play Console / Closed Testing A2/A3 packets — out of scope
- Laptop retired/frozen — not reopened

## Production matrix

### Pages (1440)

| Surface | HTTP | overflowX | skip | unlabeled | inputs labelled | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | 0 | no | 0 | yes | Primary nav visible; mobile nav hidden |
| `/login` | 200 | 0 | no | 0 | yes | AuthShell; no bottom nav |
| `/signup` | 200 | 0 | no | 0 | yes | AuthShell |
| `/support` | 200 | 0 | no | 0 | n/a | crumb `<nav>` aria-label **null** |
| `/account-deletion` | 200 | 0 | no | 0 | n/a | crumb `<nav>` aria-label **null** |
| `/search` | 200 | 0 | no | 0 | yes | |
| `/welcome` | 200 | 0 | no | 0 | n/a | headerOverflow 164; WebGL warnings |
| bogus route | **404** | 0 | no | 0 | n/a | h2 English while html was `ar`/`rtl` after cookie |

### RESPONSIVE (home / login / support × 360/390/430/768/1024/1440)

- **Page overflowX = 0** at every cell. No horizontal document scroll.
- Home **headerOverflow** (clipped chrome, not page scroll): 360=217, 390=187, 430=147, 768=335, 1024=79, 1440=0.
- ≤430: desktop Primary hidden, Primary mobile visible — contract OK.
- ≥768: desktop Primary visible, mobile hidden — contract OK.
- Login: no header overflow at any width.
- Support header height grows on small widths (wrap); overflowX 0.

### PERFORMANCE (navigation timing, first context)

| Page | TTFB ms | FCP ms | load ms | transfer KB |
| --- | --- | --- | --- | --- |
| home (cold first) | 3941 | 5177 | 5976 | 353 |
| login | 548 | 732 | 1554 | 10 |
| signup | 105 | 220 | 209 | 9 |
| support | 380 | 432 | 434 | 10 |
| account-deletion | 103 | 134 | 202 | 9 |
| search | 366 | 433 | 467 | 36 |
| welcome | 91 | 333 | 299 | 508 |

No prior shared perf baseline. First-hit home ~4–5s is **slow** but subsequent documents are fine. Not claimed as a code regression. Welcome transfer 508 KB + WebGL ReadPixels stalls — landing/welcome owner, not shared chrome.

### ACCESSIBILITY

- Keyboard home@1440: first 8 tabs hit branded home + primary links with **2px** `.watch-focus-ring`.
- Keyboard login@390: UMTUBA / language / email / password / forgot / Sign in / Create one all reachable.
- Login **email/password**: `outlineWidth 0`, `boxShadow none` (AuthField `outline-none`). Border-color-only focus. **P1**.
- Auth UMTUBA + text links: 1px browser `auto` outline only. **P2**.
- Skip link: **absent** on all tested surfaces. **P2**.
- Language select labelled. Login/signup fields labelled.
- No unlabeled buttons/links; no images missing alt on tested shells.
- Support / account-deletion / legal crumb navs: no `aria-label`. **P2**.

### RTL_LTR

- Cookie `umtuba_locale=ar`: `html lang=ar dir=rtl` on home 390/1440 and login 390.
- Login copy localized (`عالمك بانتظارك.` / `مرحبًا بعودتك`).
- Nav aria-labels switch to Arabic (`التنقل الرئيسي`, `التنقل الرئيسي للجوّال`).
- Home `h1` still English `"Home"` — page title not in shell catalog. **P2 handoff** (do not restyle Home).
- overflowX 0 in RTL. headerOverflow 180 at 390 (same chrome-density class).

### RUNTIME_ERRORS

- **pageerror count = 0**.
- Console: `[UserMenu] getUser failed: Auth session missing!` on guest home/search — expected guest, logged as error. **P2**.
- Welcome: THREE.Clock deprecated + WebGL software fallback / GPU stall (headless). Not shared shell.
- 404 resource error on intentional missing route — expected.
- `requestfailed` mostly Next `_rsc` prefetch **ERR_ABORTED** (rapid navigations) + signed video abort when leaving home. Not treated as P0/P1 app failures.

### Loading / error

- Login Suspense fallback exists in source (`auth.login.loading`).
- Unknown path returns **404** with `404` / `This page could not be found.` (Next default; not localized).

## Issues

### P0

None evidenced (no broken primary nav, no unusable auth, no page crash, no document overflow).

### P1

1. **Auth field focus visibility** — email/password have no visible ring (`outline-none`). WCAG 2.4.7. **FIXED** in worktree (`AuthField` + `.watch-focus-ring`).
2. **Mobile/tablet top chrome clip** — AppTopNav right cluster (Search + language + activity + wallet + bell + menu) `headerOverflow` 79–335px below 1440; page cannot scroll to clipped controls. **MITIGATED** by hiding Activity + Wallet below `sm`. Residual clip possible if Search+lang+bell+menu still tight at 360 — not re-measured on production (fix not deployed).

### P2

1. Missing skip link — **FIXED** (`AppChrome` + `nav.skipToContent` en/ar).
2. Weak focus on auth home/footer links — **FIXED**.
3. Unlabelled crumb navs (support / account-deletion / legal) — **FIXED**.
4. UserMenu guest `console.error` — **FIXED** (suppress `Auth session missing`).
5. Home RTL title still `"Home"` — **HANDOFF** (Home surface / i18n completeness; not Learning/Store, but not a one-line shell string).
6. 404 not localized — **HANDOFF** (Next default `not-found`).
7. Welcome headerOverflow + WebGL stalls — **HANDOFF** (welcome/landing owner).
8. Home first-hit TTFB ~4s — **HANDOFF** (host/cold; no Desktop deploy this task).

## FIXES (uncommitted)

Implemented only shared shell / auth chrome / legal crumbs / i18n skip key. No Learning curriculum. No Store commerce.

Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3-SHARED-QA`  
HEAD (base): `3bc0b95554f7c59ed174903c448011632faaf4d9`  
COMMIT_SHA = **none**

Exact files:

- `app/components/AppChrome.tsx`
- `app/components/AppTopNav.tsx`
- `app/components/UserMenu.tsx`
- `app/components/auth/AuthField.tsx`
- `app/components/auth/AuthShell.tsx`
- `app/login/page.tsx`
- `app/signup/SignupForm.tsx`
- `app/support/page.tsx`
- `app/account-deletion/AccountDeletionExperience.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/globals.css`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/appShellTranslation.test.ts`

fr/es/de/pt inherit `nav.skipToContent` via `...enMessages`.

## Tests / gates (worktree)

| Gate | Result |
| --- | --- |
| `npx vitest run` i18n appShell + foundation + authLocale | **30/30 PASS** |
| `npx vitest run app/signup/SignupForm.contract.test.ts` | **1/1 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** (Next 16.2.10; existing translation-studio NFT warning only) |
| `git diff --check` | **clean** |

## Verdict fields

```
SOURCE_SHA = 3bc0b95554f7c59ed174903c448011632faaf4d9
PRODUCTION_TESTED = YES
RESPONSIVE = PARTIAL
PERFORMANCE = PARTIAL
ACCESSIBILITY = PARTIAL
RTL_LTR = PARTIAL
RUNTIME_ERRORS = PARTIAL
FIXES = YES_UNCOMMITTED
TESTS = PASS
COMMIT_SHA = none
RELEASE_BLOCKERS = NONE_P0
FINAL_VERDICT = PARTIAL
```

## RELEASE_BLOCKERS

**None P0** for shared web shell. Do not block alpha on these alone.

Must-land before calling shared a11y/responsive **PASS**:

1. Commit + Central land of this worktree delta onto `alpha-0.2` (Desktop must not commit unless asked).
2. Re-QA production after deploy (skip link, auth focus ring, mobile chrome).

Not this owner: Home RTL title, 404 i18n, welcome WebGL, first-hit TTFB, Store/Learning product UX, Android/Play.

## Security review

- No secrets, `.env`, or service-role access.
- UserMenu change only reduces guest console noise; auth still fail-closed.
- Locale cookie already public (`umtuba_locale`); QA set it in Playwright only.
- Signed video URLs appeared in failed-request logs (existing production media); not copied into this report body.

## Migrations created

None.

## Open issues

- Fixes not on production until Central lands uncommitted worktree.
- Browser MCP unusable this session.
- Home first-hit slowness not profiled on the host.
- Welcome / 404 / Home title residuals handed off.

## git status --short (fix worktree)

```
 M app/account-deletion/AccountDeletionExperience.tsx
 M app/components/AppChrome.tsx
 M app/components/AppTopNav.tsx
 M app/components/UserMenu.tsx
 M app/components/auth/AuthField.tsx
 M app/components/auth/AuthShell.tsx
 M app/components/legal/LegalDocumentPage.tsx
 M app/globals.css
 M app/login/page.tsx
 M app/signup/SignupForm.tsx
 M app/support/page.tsx
 M lib/i18n/appShellTranslation.test.ts
 M lib/i18n/messages/ar.ts
 M lib/i18n/messages/en.ts
 M lib/i18n/messages/types.ts
```

Main checkout: only this closeout + `docs/ops/closeout/a3-shared-qa/*` + sidecar added; unrelated WIP not discarded.
