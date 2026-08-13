# LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1

SOURCE_DEVICE = LAPTOP  
DEVICE_ROLE = WHOLE_PLATFORM_USER_EXPERIENCE_QA  
TASK_ID = LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1  
DATE = 2026-08-13  
MODE = USE → REPRODUCE → FIND → FIX SAFE DEFECTS → TEST → REPORT  
SAFE_FIXES_IMPLEMENTED = none  
EXIT = STOP (no next wave)

---

## AUTHORITATIVE_BASE

- Branch: `office/um-core-platform-manifest-validation-p2`
- HEAD: `e2b97b6aa2dbeefff2890ccd4286baca71102ca6` (`docs(ai): park tomorrow-first performance resume checkpoint`)
- Production (`https://umtuba.com`) is ahead of this Laptop branch for shared auth/landing: Central `2df90a2` (`fix(auth,i18n): land Central UAF-02/03/06/08 shared auth and landing fixes`) is **not** in local HEAD.
- Laptop working tree still contains uncommitted Learning Premium UX from the previous wave. That work was **not** mixed into this QA wave and is **not** on production.

## ENVIRONMENT_TESTED

| Environment | Role |
|---|---|
| `https://umtuba.com` (production, guest/unauthenticated) | Primary runtime QA via Cursor browser |
| Local source at HEAD + uncommitted Learning UX | Source confirmation for ownership, UAF mapping, Home lock |
| Viewports | Desktop (~1905px), 390×844, 360×800 (CDP `Emulation.setDeviceMetricsOverride`) |
| Auth | Guest only. No production account created. No privileged writes. |

Authenticated surfaces (profile edit, logout, messages compose, lesson/quiz/AI Tutor, own-content delete, username propagation) are **BLOCKED** without a safe test account.

## OWNERSHIP BOUNDARIES RESPECTED

- Did **not** touch production deploy, account-deletion, Store files, Android/iOS, auth secrets.
- Did **not** reopen Learning domain/migrations/certification.
- Did **not** edit Home-locked files (`app/discover/DiscoverExperience.tsx`, `HomeSectionCircles.tsx`, etc.).
- Did **not** re-implement Central UAF-02/03/06/08 (already on production; still missing from Laptop branch).
- Safe-fix gate: no defect met all six criteria (reproduced + Laptop-owned + no overlap + small + understood + testable) without colliding with Central/Home/Store/World.

---

## USER_JOURNEYS_TESTED

### Public / entry — guest runtime

- `/` Home video feed — PASS (loads; guest Follow → `/login?next=/?post=13`)
- `/welcome` — PASS (Join UMTUBA; Start Exploring / Open Home Feed → Home)
- `/signup` — PASS (2-step credentials→profile; empty submit shows field errors + `role=alert`)
- `/login` — PASS (`next` preserved; copy “Continue to your Profile, or wherever you left off.”)
- `/forgot-password` — PASS (form + Back to sign in)
- `/auth/callback` (no tokens) — PASS (fail-closed login alert; UAF-05)
- Language switcher — FAIL/BLOCKED (none visible; `html lang="en"` always)
- RTL — BLOCKED (no in-product locale control found)
- Logout — BLOCKED (requires session)

### Profile / settings — guest

- `/profile` → `/login?next=/profile` — PASS (gate)
- `/settings` → login with `next` — PASS (gate)
- Edit profile / avatar / username — BLOCKED

### Social / content — guest

- Home Watch/feed — PASS (video player, creator identity `@mohamad`, Follow/Message/Like present)
- Create circle / Upload → `/create/video` — PARTIAL (UAF-01; text/image API exists, primary CTA is video)
- `/create` → `/login?next=/create` — PASS (gate)
- Discover CTA from Search → `/discover` (Home lock) — expected Home
- Own-content delete / report menus — BLOCKED / FAIL from source (UAF-12)

### World / globe

- `/world` — FAIL (honest empty: “World Discovery database migrations are not available in this environment yet.” No globe, no city, no controls)
- Welcome decorative globe — visual only
- Explore This City on Home — FAIL (`/?focus=umtuba`; stays on Home)

### Messages

- `/messages` → `/login?next=/messages` — PASS (gate)
- Conversation list / compose / keyboard — BLOCKED

### Learning (guest revalidation only; domain CLOSED)

- `/learning` → login `?next=/learning` — PASS (gate)
- `/learning/catalog` — PASS (lists courses) with WP-QA-03 content defects
- `/learning/catalog/ja-01` — PASS (curriculum preview; Start Course href → login with course `next`)
- Lesson / progress / quiz / certification / AI Tutor / mobile lesson chrome — BLOCKED (auth). Production does **not** include Laptop Learning Premium UX.

### Store — observe only

- Public Store reachable; E2E sandbox products visible (WP-QA-04). No Store file edits.

### Other

- `/search` — empty state OK; query `umtuba` shows “Searching UMTUBA…” for ≥14s with no results/error/retry (WP-QA-09)
- `/live` — unavailable + Try again does not recover (WP-QA-06)
- `/games` — honest “Unavailable in this Beta” (WP-QA-07)

---

## UAF REGRESSION

| ID | Status | Evidence |
|---|---|---|
| UAF-01 | PARTIAL | `createPost()` allows text/image. Home Create circle + Upload go to `/create/video`. Guest create is login-gated. |
| UAF-02 | PASS on production; OWNED_ELSEWHERE locally | Production 2-step signup. Laptop source still older long form. Do not duplicate Central fix. |
| UAF-03 | OWNED_ELSEWHERE / BLOCKED on surfaces tested | Central landed i18n/auth. No language control on Home/Welcome/Login. `html lang="en"` always. |
| UAF-04 | PARTIAL / BLOCKED | Home duplicates Learning in top nav + circles. Authenticated lesson overlap not testable. Premium learner subnav not on production. |
| UAF-05 | PASS | `/auth/callback` without tokens → login + invalid/expired link alert. |
| UAF-06 | PASS on production; OWNED_ELSEWHERE locally | Production “Join UMTUBA”. Laptop `LandingHero.tsx` still “Join Beta”. Do not duplicate. |
| UAF-07 | FAIL | Reproduced: Explore This City → `https://umtuba.com/?focus=umtuba`. Stays on Home. Lives in Home-locked `DiscoverExperience.tsx` via `buildHomeCityFocusHref`. |
| UAF-08 | PASS on production | Login copy + `next` preserved (`/learning/courses/{uuid}`, `/profile`, `/messages`, `/create`, `/?post=13`). Laptop still `DEFAULT_POST_AUTH_PATH = "/discover"`. |
| UAF-09 | FAIL / BLOCKED | `/world` has no globe/controls. Welcome globe is decorative. |
| UAF-10 | PARTIAL | Welcome Start Exploring → Home (correct). World globe → Home N/A. Home Explore This City is UAF-07. |
| UAF-11 | BLOCKED | Needs authenticated profile. |
| UAF-12 | FAIL (source) / BLOCKED (runtime) | No user post-delete UI in profile/components. Comment delete exists for messages, not posts. |

---

## FINDINGS

### WP-QA-01

- SURFACE: Home / Explore This City
- SEVERITY: P2
- REPRODUCED: YES (runtime + source)
- EXPECTED: City focus / city exploration distinct from current Worldwide Home
- ACTUAL: `/?focus=umtuba` — click stays on Home (“Now exploring UMTUBA, Worldwide”)
- OWNER: CENTRAL (Home lock)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-02

- SURFACE: `/world`
- SEVERITY: P2
- REPRODUCED: YES
- EXPECTED: Globe, city interaction, Explore This City, controls
- ACTUAL: Empty stub — migrations unavailable; GPS not requested
- OWNER: CENTRAL / World
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-03

- SURFACE: Learning catalog + course landing
- SEVERITY: P2
- REPRODUCED: YES
- EXPECTED: Human course titles/descriptions
- ACTUAL: `Normalized from LEARNING_IMPORT pilot`, markdown `**requests**`, JA-* duplicates vs human titles, internal module IDs (`M01-L01`)
- OWNER: CENTRAL / Learning data (do not reopen domain)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-04

- SURFACE: Store
- SEVERITY: P2
- REPRODUCED: YES (observe)
- EXPECTED: Real catalog for public users
- ACTUAL: Sandbox E2E products (`UMTUBA_E2E_20260721 Simple Mug`), “Media coming soon”, awkward “3 active product s”
- OWNER: CENTRAL / Store
- FIX_IMPLEMENTED: NO (forbidden)
- TEST_RESULT: N/A
- STATUS: OPEN — ASSIGNED_TO_CENTRAL

### WP-QA-05

- SURFACE: Document titles
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: `Learning Catalog | UMTUBA`
- ACTUAL: `Learning Catalog | UMTUBA | UMTUBA` (page title already includes brand; `TITLE_TEMPLATE = %s \| ${BRAND.name}`)
- OWNER: CENTRAL / platform metadata
- FIX_IMPLEMENTED: NO (not isolated; many routes)
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-06

- SURFACE: Live
- SEVERITY: P2
- REPRODUCED: YES
- EXPECTED: Live hub or honest unavailable with working retry / next step
- ACTUAL: Temporarily unavailable; Try again does not recover
- OWNER: CENTRAL / Live
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-07

- SURFACE: Games (Home circle)
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: Games experience or not promoted as a primary circle
- ACTUAL: Honest “Unavailable in this Beta”
- OWNER: CENTRAL
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-08

- SURFACE: Global navigation
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: One clear path per destination
- ACTUAL: Top nav + Home circles + bottom nav duplicate Learning/Live/Messages/Search
- OWNER: CENTRAL (Home lock + chrome)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-09

- SURFACE: Search
- SEVERITY: P2
- REPRODUCED: YES
- EXPECTED: Results, empty, or error with retry after a bounded wait
- ACTUAL: Query `umtuba` stays on “Searching UMTUBA…” ≥14s; URL stays `/search` (no `q=`); no timeout/error
- OWNER: CENTRAL / Search
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-10

- SURFACE: Learning course landing guest CTAs
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: Download App → store listing or app install
- ACTUAL: `https://umtuba.com/welcome`
- OWNER: CENTRAL / Learning presentation (Desktop/PC2 if store URLs)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-11

- SURFACE: Learning course landing
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: Single H1
- ACTUAL: H1 “Course” and H1 course title
- OWNER: CENTRAL / Learning presentation (local Premium UX not on production)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-12

- SURFACE: i18n / language
- SEVERITY: P2
- REPRODUCED: YES (absence)
- EXPECTED: User-visible language control; `lang`/`dir` follow locale
- ACTUAL: No switcher on Home/Welcome/Login; `html lang="en"` hardcoded
- OWNER: CENTRAL (UAF-03 already claimed; do not duplicate)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — OWNED_ELSEWHERE

### WP-QA-13

- SURFACE: Create / Upload
- SEVERITY: P2
- REPRODUCED: YES (href + Home lock source)
- EXPECTED: Text/image/video create paths discoverable
- ACTUAL: Home Create + Upload → `/create/video` only
- OWNER: CENTRAL (Home lock)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT (UAF-01)

### WP-QA-14

- SURFACE: Own post deletion
- SEVERITY: P2
- REPRODUCED: YES (source); runtime BLOCKED (auth)
- EXPECTED: Owner can delete own post
- ACTUAL: No post-delete UI found
- OWNER: CENTRAL / social
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT (UAF-12)

### WP-QA-15

- SURFACE: Home mobile circles (390px)
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: All section shortcuts visible or clearly scrollable
- ACTUAL: Fifth circle clipped; no horizontal document overflow (`scrollWidth === 390`)
- OWNER: CENTRAL (Home lock)
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

### WP-QA-16

- SURFACE: Home feed captions
- SEVERITY: P3
- REPRODUCED: YES
- EXPECTED: Meaningful title
- ACTUAL: “Untitled video”
- OWNER: CENTRAL / content
- FIX_IMPLEMENTED: NO
- TEST_RESULT: N/A
- STATUS: OPEN — REPORT

---

## ACCESSIBILITY (basics)

| ID | Severity | Note |
|---|---|---|
| A11Y-01 | P3 | Duplicate H1 on course landing (WP-QA-11) |
| A11Y-02 | P2 | `html lang="en"` always (WP-QA-12) |
| A11Y-03 | P3 | Signup errors use `role=alert` (good); red-on-near-black contrast is tight |
| A11Y-04 | BLOCKED | Full keyboard pass not completed |
| A11Y-05 | P2 | Search loading has visible text but no failure/timeout (WP-QA-09) |
| A11Y-06 | PASS | Icon controls generally have accessible names (“Sign in to view notifications”) |
| A11Y-07 | PASS | Signup empty-submit validation is clear |

Touch targets on primary CTAs (Sign in, Continue, Follow) are adequate. Home engagement icons are compact but typical for video-first UI.

## RESPONSIVE NOTES

- 360 / 390: no document horizontal overflow on Home or Welcome.
- Welcome 360: Join UMTUBA + Start Exploring / Go Live usable; bottom nav present.
- Login 360: form usable (marketing column stacks / collapses).
- Catalog/course desktop: no overflow at ~1905px.
- 430 / tablet / 1440: inferred from desktop + 390; not a separate device lab.
- Client-side Next.js clicks in the automation browser often did not navigate (View Course, Start Course, Go Live) while **hrefs/onClick targets were valid**. Direct URL navigation worked. **Not counted as dead buttons.**

## INTERACTION NOTES

- Guest Follow → login with `next=/?post=13` — PASS
- Guest Story “Sign in to add a story” — PASS (named gate)
- Explore This City — wrong destination, not a no-href dead button
- Live Try again — failed recovery (WP-QA-06)
- Signup validation — PASS

## ERROR / EMPTY / LOADING

- Search empty (no query) — PASS
- Search in-flight — visible “Searching…” then stall (WP-QA-09)
- World empty — honest but primary-nav dead end (WP-QA-02)
- Games / Live unavailable — honest
- Auth gates — consistent `next` preservation on production
- `/auth/callback` fail-closed — PASS

---

## COUNTS

- TOTAL_FINDINGS = 16 (WP-QA-01..16)
- P0_COUNT = 0
- P1_COUNT = 0
- P2_COUNT = 9 (01, 02, 03, 04, 06, 09, 12, 13, 14)
- P3_COUNT = 7 (05, 07, 08, 10, 11, 15, 16)
- DEAD_BUTTONS_FOUND = 0 confirmed (automation Link/router clicks unreliable; Live retry is failed recovery not a silent no-op)
- WRONG_NAVIGATION_FOUND = 3 (Explore This City; Download App→Welcome; Create/Upload→video-only)
- MOBILE_DEFECTS_FOUND = 1 (WP-QA-15 circles clip)
- RTL_I18N_DEFECTS_FOUND = 1 (WP-QA-12)
- ACCESSIBILITY_FINDINGS = 7 rows above (2 P2, 3 P3, 1 BLOCKED, 2 PASS)

## SAFE_FIXES_IMPLEMENTED

none

## FILES_CHANGED (this wave)

- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`

Pre-existing uncommitted Learning Premium UX files are **not** part of this wave.

## TEST_RESULTS

N/A — docs only; no product code changed.

## TYPECHECK

N/A this wave (no TS product edits). Prior Learning wave: `npx tsc --noEmit` passed.

## BUILD_RESULT

N/A this wave. Prior Learning wave: `npm run build` passed.

## NEW_REGRESSION

None introduced by this wave (no product edits).

## ASSIGNMENTS

FINDINGS_ASSIGNED_TO_CENTRAL:
- WP-QA-01 (UAF-07, Home lock)
- WP-QA-02 (World)
- WP-QA-03 (Learning catalog content)
- WP-QA-04 (Store sandbox)
- WP-QA-05 (title template)
- WP-QA-06 (Live retry)
- WP-QA-07 (Games)
- WP-QA-08 (nav redundancy)
- WP-QA-09 (Search hang)
- WP-QA-10 (Download App)
- WP-QA-11 (duplicate H1; production Learning chrome)
- WP-QA-12 (i18n visibility; already Central UAF-03)
- WP-QA-13 (UAF-01 Create CTA; Home lock)
- WP-QA-14 (UAF-12 post delete)
- WP-QA-15 (Home mobile circles)
- WP-QA-16 (Untitled video)
- Fast-forward Laptop branch with production `2df90a2` (UAF-02/03/06/08) to avoid local drift

FINDINGS_ASSIGNED_TO_DESKTOP: none from this guest web sweep (Android/Play not exercised)

FINDINGS_ASSIGNED_TO_PC2: none from this guest web sweep (iOS/App Store not exercised). WP-QA-10 store URL may need Desktop/PC2 if Central wants real store links.

## REMAINING_FINDINGS

All 16 WP-QA items remain OPEN. Authenticated UAF-04/11/12 runtime and Learning lesson/quiz/AI Tutor remain BLOCKED pending a safe test account.

## WHOLE_PLATFORM_UX_QA_VERDICT

**FAIL_WITH_FINDINGS — guest public entry is usable; not a whole-platform PASS.**

No P0. Major guest paths (Home, Welcome, Signup, Login, Catalog preview, auth gates) work. Users will still hit: Explore This City does nothing useful, World is an empty primary destination, Search can hang, Create is video-only, Store shows sandbox SKUs, catalog copy looks internal, no language control.

## CENTRAL_ACTION_REQUIRED

YES. Triage WP-QA-01/02/04/09 first. Do not ask Laptop to patch Home-locked or Store files. Fast-forward Laptop onto Central auth/i18n commits. Learning Premium UX remains uncommitted on Laptop and is not on production.

## NEXT_ACTION_REQUIRED

STOP. Do not start another Laptop wave. Central reviews this report. Authenticated sweep needs a dedicated non-production test account from Central.
