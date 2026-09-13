# DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** GOOGLE PLAY / CLOSED TESTING / RELEASE OPERATIONS  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1  
**OWNER:** GOOGLE PLAY / CLOSED TESTING / RELEASE OPERATIONS  
**PACKAGE:** `com.umtuba.app`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**WORKTREE_PREFERRED:** `worktrees/DESKTOP-A2` present (commerce branch `716bf47`) — this packet written in the parent web workspace where `play-assets/` already lives. Subagent cannot `move_agent_to_root`.  
**PRODUCTION_WEB_SHA:** `b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089`  
**PRODUCTION_RELEASE:** `b3fd0d0-20260815122211`

This is an **execution** packet, not a plan. Cursor MCP browser could not hold a Play Console tab (2 attempts, then STOP). No Console field was saved. No AAB uploaded. Production was not submitted. No secrets. Tester emails not reprinted. `docs/ai/PROJECT_STATE.md`, `CURRENT_TASK.md`, `CURSOR_REPORT.md`, and `SESSION_HANDOFF.md` were **not** overwritten.

---

## Immediate return

```
TASK_ID = DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1
STATUS = BLOCKED_CONSOLE_TAB / HUMAN_BROWSER_REQUIRED
V5_PLAY_STATE = NOT_ON_PLAY (live Play binary last known versionCode 3; v5 not built / not authorized)
CLOSED_TEST_TRACK = ALPHA / UMTUBA Closed Testers (prior operator; NOT_OCR_THIS_SESSION)
TESTERS_CONFIGURED = YES_PRIOR_OPERATOR_LIST (not re-confirmed in Console this session)
TESTER_COUNT = UNKNOWN (listed floor prior ≥17 / ~25; not OCR)
TESTERS_OPTED_IN = UNKNOWN
OPT_IN_LINK_READY = UNKNOWN (pattern https://play.google.com/apps/testing/com.umtuba.app — not fetched/confirmed this session)
QUALIFYING_PERIOD_START = UNKNOWN / NOT_PROVEN (list calendar age 2026-08-13 → 2026-08-15 = 2 days; clock starts at ≥12 opted-in, not list-create)
QUALIFYING_PERIOD_COMPLETE = NO
STORE_LISTING = PARTIAL (local icon + feature + text ready; not uploaded; phone screenshots MISSING)
APP_CONTENT = PARTIAL (Data Safety / App access prior-complete; Ads / IARC / UGC / content declarations not saved this session)
TARGET_AUDIENCE = AGES_COMPLETE_REMAINDER_UNCONFIRMED (13–15 / 16–17 / 18+; remainder not OCR)
COUNTRIES = CLOSED_TESTING_ALL_AVAILABLE_PRIOR (not re-OCR; Production countries N/A)
DATA_SAFETY = ALREADY_COMPLETE (do not reopen)
PRIVACY_POLICY = LIVE_PUBLIC https://umtuba.com/privacy HTTP 200 (this session)
ACCOUNT_DELETION_URL = LIVE_PUBLIC https://umtuba.com/account-deletion HTTP 200; files in prod SHA b3fd0d0; release folder b3fd0d0-20260815122211 confirmed
UGC_DECLARATIONS = HONEST_NO_FOR_V3_NOT_SAVED (do not declare in-app report/block/terms as if v5 were live)
REVIEWER_ACCESS = ALREADY_COMPLETE (do not reopen unless Console asks; use PASTE_REVIEW_ACCESS_V3_HONEST.txt only)
ADS_DECLARATION = NOT_SAVED_THIS_SESSION (select No ads — PASTE_ADS.txt)
CONTENT_RATING = NOT_SAVED_THIS_SESSION (honest v3 IARC — PASTE_IARC.txt)
PRODUCTION_ACCESS = NO
PRODUCTION_SUBMISSION_PERFORMED = NO
OPERATOR_ACTION_REQUIRED = YES
BLOCKERS = YES
CENTRAL_ACTION_REQUIRED = YES (v5 SOURCE ACCEPTANCE / BUILD_GO still required; no AAB upload authorization)
```

---

## What this session actually did

| Action | Result |
|--------|--------|
| Read `PROJECT_STATE.md` + `CURRENT_TASK.md` | Done. Current task is `SHUTDOWN_SAFE` (not this GO). Allowed/forbidden of that file do not authorize Play writes; this GO is the user EXECUTE. |
| `git fetch --prune` | Done. Parent `office/profile-hero-completeness-v1` @ `380a366` vs origin **0/0**. No FF needed. No merge/rebase/reset. |
| Prefer `worktrees/DESKTOP-A2` | Present. `move_agent_to_root` denied for subagent. Packet written here. |
| Public deletion URL | **LIVE.** HTTP 200. Title `Delete your UMTUBA account \| UMTUBA`. Canonical `https://umtuba.com/account-deletion`. Sign-in required to submit. Queues a request. Not immediate `deleteUser`. |
| Deletion vs Production `b3fd0d0` | **MATCH on tree + release folder.** `git ls-tree` on `b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089` contains `app/account-deletion/page.tsx` and `AccountDeletionExperience.tsx`. `https://umtuba.com/_next/static/b3fd0d0-20260815122211/` returns nginx **308** to that release path. Live HTML does not embed the git SHA (Next build id is a content hash). Page is **public**; not a blocker. |
| Privacy / Terms | `https://umtuba.com/privacy` HTTP 200. `https://umtuba.com/terms` HTTP 200. |
| Cursor MCP browser | **FAIL × 2.** STOP. See §Console attempts. |
| System browser | `Start-Process https://play.google.com/console` launched for the human operator. Agent cannot drive that window. |
| Console OCR / save | **NONE.** |
| AAB upload | **NO.** |
| Apply for production | **NO.** Ineligible even if Console were open (12/14 unproven; calendar max 2 days). |

`OPERATOR_ACTIONS_COMPLETED = NONE` (no Play field saved).  
`GOOGLE_PLAY_MUTATED = NO`.

---

## Console attempts (2, then STOP)

Prior session already vanished at `about:blank` before `play.google.com/console`. This session used a **different** first approach, then one retry, then stopped.

| # | Approach | Result |
|---|----------|--------|
| 1 | `browser_tabs` list (empty) → `browser_tabs` new (`viewId=f2c4d3`, `about:blank`) → lock first → navigate with that `viewId` | Tab created, then vanished. Lock: `No browser tab available`. Navigate: `Browser view not found: f2c4d3`. |
| 2 | `browser_navigate` `https://play.google.com/console` `newTab: true` (no stale viewId) | `No browser tab available. Please navigate to a page first.` |

No third MCP loop. Human Console in a real browser is the remaining path.

---

## Closed Testing — truthful state (not PASS)

Official rule (unchanged; [14151465](https://support.google.com/googleplay/android-developer/answer/14151465)): personal accounts created after 13 Nov 2023 need **≥12 testers opted-in continuously for the last 14 days**, then Apply for production from the Dashboard. Listed ≠ invited ≠ opted-in ≠ installed. Internal Testing does **not** count. Current floor is **12**, not 20.

| Layer | This session |
|-------|----------------|
| Track | Closed Testing **Alpha** (prior). Not Internal. Not Production. |
| List | “UMTUBA Closed Testers” created **2026-08-13** (prior operator). Do not create a new list. Do not upload CSV. |
| Listed | Prior ≥17 (2026-08-13) / ~25 (2026-08-14). `LOCAL_LIST_FILE = NONE`. **Not OCR today.** |
| Invited | **UNKNOWN** |
| Opted-in | **UNKNOWN** — this is the number that counts |
| Installed (Closed) | **UNKNOWN** |
| Opt-in URL | Procedure pattern only: `https://play.google.com/apps/testing/com.umtuba.app` — **not confirmed this session** |
| Qualifying start | **UNKNOWN.** Clock does not start on list-create. Starts when Console shows ≥12 opted-in and holds. |
| Calendar age of list | **2 days** (2026-08-13 → 2026-08-15). Even if ≥12 had opted in on day 1 (**unproven**), max continuous days = **2 < 14**. |
| Qualifying complete | **NO.** Do not claim the testing period elapsed. |

v5 is **not** on Play. Do not treat Closed Testing as a v5 track.

---

## Play Console cards — actionable vs already complete

Honesty rule: live Play binary is still **v3**. Do not declare in-app UGC tools, Terms-before-publish, or in-app delete as if v5 were live.

| Card | Verdict | Human next action |
|------|---------|-------------------|
| Data Safety | **ALREADY_COMPLETE** (2026-08-13) | Do not reopen. |
| App access / reviewer | **ALREADY_COMPLETE** | Do not reopen unless Console asks. If it asks: `PASTE_REVIEW_ACCESS_V3_HONEST.txt` only. Never mobile `REVIEWER_INSTRUCTIONS.txt`. |
| Account deletion URL (Play field) | Prior operator URL-half complete; **web URL LIVE this session** | Skip if Publishing overview already shows complete. Else `PASTE_ACCOUNT_DELETION.txt` → `https://umtuba.com/account-deletion`. Never `/privacy` or `/`. In-app delete in v3 = NO. |
| Privacy policy field | Live URL **200** | Confirm `https://umtuba.com/privacy`. Do not change. |
| Ads | Not saved this session | Policy → App content → Ads → **No, my app does not contain ads** (`PASTE_ADS.txt`). Skip if overview already complete. |
| Target audience remainder | Ages already 13–15 / 16–17 / 18+ | Remainder only (`PASTE_TARGET_AUDIENCE_REMAINDER.txt`). Do not change ages. Do not select under-13. Do not switch to 18+ only. |
| IARC / content rating | Not saved this session | `PASTE_IARC.txt`. Moderation = **NO** for v3. Do not paste mobile `CONTENT_RATING_IARC.txt`. |
| Content declarations | Not saved this session | `PASTE_CONTENT_DECLARATIONS.txt` — News / COVID / Government / Financial / Health = **NO**. |
| UGC | Not saved this session | `PASTE_UGC.txt` — UGC/public/1:1 = YES; report/block/terms = **NO**. Save only if the form accepts honest NO. |
| Store listing | Local assets ready; not uploaded | Icon + feature + short/full text. Screenshots still **MISSING** — do not fabricate. |
| Store settings | Not saved this session | `PASTE_SUPPORT_CONTACT.txt` — Category Social; website `https://umtuba.com`; existing developer email only. |
| Countries | Closed Testing all-available (prior) | Confirm only (`PASTE_COUNTRIES.txt`). Do not create a Production track. |
| App signing | Not OCR | Read-only (`PASTE_APP_SIGNING.txt`). Do not generate a new upload key. |
| Production access | **NO** | Do not Apply. |
| Production submission | **NO** | Forbidden and ineligible. |

---

## Exact next human screen (do this first)

MCP cannot hold the tab. A system browser window was opened to the Console home. Finish in **Chrome or Edge as the Play developer**, not Cursor’s browser.

### Step 1 — Closed Testing Testers (highest leverage)

1. Open **https://play.google.com/console** (already launched). Sign in as the Play developer.
2. Open app **UMTUBA** / `com.umtuba.app`.
3. Click path: **Test and release → Testing → Closed testing → Manage track (Alpha) → Testers**.
4. Confirm list **“UMTUBA Closed Testers”** is selected. Do **not** create a new list. Do **not** upload CSV. Do **not** reprint emails.
5. Record from the page (not the email-list count):
   - `LISTED_COUNT_SHOWN`
   - `OPTED_IN_COUNT`
   - `RELEASE_STATUS` (draft vs available)
   - `OPT_IN_URL_VISIBLE` (copy the join link if shown)
   - `DATE_12_FIRST_HELD` if Console shows when ≥12 first held
6. If opted-in **< 12**: send the **existing** Closed testing opt-in URL only to people already on that list. They open it on the listed Google account and tap **Become a tester**. Stay opted in.
7. If opted-in **≥ 12**: record today’s date as the first proven hold **only if Console shows that**. Qualifying complete is still **NO** until 14 continuous days.

Paste file: none (read/confirm only).

### Step 2 — Ads

URL after app open: **Policy → App content → Ads**  
File: `docs/ops/closeout/play-assets/PASTE_ADS.txt`  
Select: **No, my app does not contain ads**. Save. Skip if Publishing overview already marks Ads complete.

### Step 3 — Target audience remainder

**Policy → App content → Target audience and content**  
File: `docs/ops/closeout/play-assets/PASTE_TARGET_AUDIENCE_REMAINDER.txt`  
Do not touch the three age boxes. Finish App details / Ads / Store presence / Summary. Save.

### Step 4 — IARC

**Policy → App content → Content ratings → Start**  
File: `docs/ops/closeout/play-assets/PASTE_IARC.txt`  
Honest v3. In-app moderation = **NO**.

### Step 5 — Content declarations

**Policy → App content → News / COVID / Government / Financial / Health**  
File: `docs/ops/closeout/play-assets/PASTE_CONTENT_DECLARATIONS.txt`  
All **NO**.

### Step 6 — UGC

**Policy → App content → User-generated content**  
File: `docs/ops/closeout/play-assets/PASTE_UGC.txt`  
YES / YES / YES / **NO / NO / NO / NO**. Do **not** paste `umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt`.

### Step 7 — Account deletion (only if overview still open)

**Policy → App content → Account deletion**  
File: `docs/ops/closeout/play-assets/PASTE_ACCOUNT_DELETION.txt`  
Paste: `https://umtuba.com/account-deletion`  
Skip if Publishing overview already shows Account deletion complete.

### Step 8 — Store settings

**Grow → Store presence → Store settings**  
File: `docs/ops/closeout/play-assets/PASTE_SUPPORT_CONTACT.txt`

### Step 9 — Main listing (text + local graphics; no fake screenshots)

**Grow → Store presence → Main store listing**  
Files:
- `PASTE_SHORT_DESCRIPTION.txt`
- `PASTE_FULL_DESCRIPTION.txt`
- `icon-512x512.png`
- `feature-graphic-1024x500.png`  
Phone screenshots: still **MISSING**. Capture later from Internal Testing **v3** (`PHONE_SCREENSHOT_CAPTURE_PLAN.txt`). Do not mock Safety UI.

### Step 10 — Do not click

- Upload versionCode 4 or 5 AAB
- Apply for production
- Reopen Data Safety, App Access, or the three target-age boxes
- Save UGC / IARC / listing claims that report, block, Terms-before-publish, or in-app delete exist

---

## Blockers

1. **Cursor MCP browser cannot hold a Play Console tab** (this session + prior). Human Chrome/Edge required.
2. **Opted-in count unknown** — 12/14 clock not proven; list calendar age 2 days.
3. **v5 not on Play** — no Central AAB authorization; do not upload.
4. **Store listing incomplete** without ≥2 real v3 phone screenshots.
5. **Remaining App content cards** (Ads / IARC / UGC / declarations / TA remainder) not proven saved.

Non-blockers this session:
- Public account-deletion URL is live and present on Production `b3fd0d0` / `b3fd0d0-20260815122211`.
- Privacy + Terms URLs live.

---

## Central

`CENTRAL_ACTION_REQUIRED = YES`

- Rerun v5 SOURCE ACCEPTANCE / send `DESKTOP_V5_BUILD_GO` before any new AAB.
- Do not treat this packet as upload clearance.
- Laptop remains RETIRED/FROZEN. External server not restarted/deployed.

---

## Files

| File | Action |
|------|--------|
| `docs/ops/closeout/DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1.md` | **This execution** (created) |
| `docs/ops/closeout/play-assets/OPERATOR_REMAINING_CLICKS_2026-08-15.txt` | Refreshed for human Console (fields not mutated) |
| `docs/ops/closeout/play-assets/PASTE_*.txt` | Reused, not rewritten |
| `docs/ai/PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` | **Not overwritten** |

No commit. No push. No secrets. `_port_extract` not touched. Nothing written to the Windows Desktop.

---

## Continuation 2026-08-15 ~17:34 — EXECUTE (v5 Alpha already uploaded)

Operator-given state (treat as given; **not re-OCR’d** — Cursor browser still cannot hold Console):

- ANDROID V5 AAB = UPLOADED
- PLAY_RECOGNIZED_VERSION_CODE = 5
- VERSION_CODE_3 = REMOVED_FROM_CURRENT_ALPHA_RELEASE
- TARGET = ALPHA / CLOSED TESTING ONLY
- TESTER_LIST = UMTUBA Closed Testers
- TESTER_COUNT_CONFIGURED = 25

Play review currently blocks Closed Testing with 3 mandatory errors (operator): (1) App Dashboard/setup remaining steps, (2) Full description required, (3) Google Play AI-generated image/video declaration form required.

This continuation did **not** fabricate PASS. Production was not submitted. No AAB uploaded/rebuilt. v3 was not put back on Alpha.

### Immediate return (this continuation)

```
TASK_ID = DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1
STATUS = BLOCKED_CONSOLE_TAB / STOPPED_AI_MEDIA_HUMAN_INPUT
V5_PLAY_STATE = UPLOADED_ALPHA_OPERATOR_GIVEN (PLAY_RECOGNIZED_VERSION_CODE = 5; not re-OCR this session)
CLOSED_TEST_TRACK = ALPHA / CLOSED TESTING ONLY (operator-given; not re-OCR)
TESTERS_CONFIGURED = YES — UMTUBA Closed Testers (operator-given)
TESTER_COUNT = 25_CONFIGURED (operator-given; listed ≠ opted-in)
TESTERS_OPTED_IN = UNKNOWN (not OCR)
OPT_IN_LINK_READY = UNKNOWN (not OCR)
QUALIFYING_PERIOD_START = UNKNOWN / NOT_PROVEN
QUALIFYING_PERIOD_COMPLETE = NO
STORE_LISTING = PARTIAL (full description paste-ready; AI declaration STOPPED; screenshots still MISSING)
FULL_DESCRIPTION = PASTE_READY_NOT_SAVED (PASTE_FULL_DESCRIPTION.txt; 785/4000; truthful for Watch/Discover/Create/Messages; does not claim Live or invent Safety copy)
AI_GENERATED_MEDIA_DECLARATION = STOPPED_HUMAN_INPUT_REQUIRED
APP_DASHBOARD_SETUP = UNKNOWN_REMAINING (operator says mandatory steps remain; not OCR)
APP_CONTENT = PARTIAL (Data Safety / reviewer access ALREADY_COMPLETE — do not reopen unless Console requires)
TARGET_AUDIENCE = AGES_COMPLETE_REMAINDER_UNCONFIRMED
COUNTRIES = CLOSED_TESTING_ALL_AVAILABLE_PRIOR
DATA_SAFETY = ALREADY_COMPLETE (do not reopen)
PRIVACY_POLICY = LIVE_PUBLIC https://umtuba.com/privacy
ACCOUNT_DELETION_URL = LIVE_PUBLIC https://umtuba.com/account-deletion (prior session HTTP 200 on Production b3fd0d0)
UGC_DECLARATIONS = DO_NOT_USE_PASTE_UGC_V3_NO (Play binary is now v5; v3 NO answers would be a false declaration if v5 has report/block/terms)
REVIEWER_ACCESS = ALREADY_COMPLETE (do not reopen unless Console requires)
ADS_DECLARATION = NOT_SAVED_THIS_SESSION (PASTE_ADS.txt = No ads — still accurate)
CONTENT_RATING = NOT_SAVED_THIS_SESSION (PASTE_IARC.txt moderation=NO is now STALE if v5 has in-app report/block)
ALPHA_BUNDLE_ONLY_V5 = OPERATOR_GIVEN_NOT_REVERIFIED
ROLLED_OUT_CLOSED_TESTING = NO (blocked by 3 review errors; this session saved nothing)
PRODUCTION_SUBMISSION_PERFORMED = NO
OPERATOR_ACTION_REQUIRED = YES
BLOCKERS = YES
CENTRAL_ACTION_REQUIRED = NO_FOR_AAB (v5 already uploaded per operator; do not rebuild)
```

### Human-input stop (first field that must not be guessed)

```
SCREEN = Grow → Store presence → Main store listing → Google Play AI-generated image/video declaration
  (also reachable from the Closed Testing review-errors list: the AI-generated media required item)
FIELD = “Are any of the images or videos in your store listing generated by AI?” (and any follow-up asset checkboxes)
WHY_HUMAN_INPUT_REQUIRED = Origin of the brand chevron is not documented as generative-AI or as human-designed. play-assets + prior closeouts record only that icon-512x512.png is a byte-identical copy of umtuba-mobile/assets/images/android-icon-foreground.png and feature-graphic-1024x500.png is a flatten of the existing chevron/construction-grid graphic onto #050510. No closeout names Midjourney/DALL·E/Imagen/Figma/Illustrator/a designer. Visual inspection looks like a geometric vector mark, which is not proof. Guessing Yes or No would be a false declaration.
EXACT_OPERATOR_ACTION = Open that form in Chrome/Edge as the Play developer. Answer from your knowledge of who made the original chevron (the Android adaptive-icon foreground / construction-grid master). If you made it in a design tool with no generative AI, select No. If any listing image/video was produced or substantially generated by AI, select Yes and mark those assets. Do not upload a new graphic to dodge the question. Do not ask an agent to guess.
```

### Console attempts this continuation (1 + 1 retry, then STOP)

| # | Approach | Result |
|---|----------|--------|
| 1 | `browser_tabs` list (empty) → `browser_navigate` `https://play.google.com/console` | **FAIL** — `No browser tab available. Please navigate to a page first.` |
| 2 (retry) | `browser_tabs` new (`viewId=41162b`, `about:blank`) → lock-first → navigate with that viewId | Tab created then vanished. Lock: `No browser tab available`. Navigate: `Browser view not found: 41162b`. |

No third MCP loop. No Console field saved. `GOOGLE_PLAY_MUTATED = NO`.

### What can be completed truthfully (human Chrome/Edge — exact path)

Do **not** Apply/submit Production. Do **not** upload another AAB. Do **not** add versionCode 3 back onto this Alpha release.

**Error 2 — Full description (agent can specify; human must paste because MCP cannot hold the tab)**

1. URL: `https://play.google.com/console`
2. App: UMTUBA / `com.umtuba.app`
3. Path: **Grow → Store presence → Main store listing → Full description** (or click the review-error “Full description is required”)
4. Paste file: `docs/ops/closeout/play-assets/PASTE_FULL_DESCRIPTION.txt`
5. Text is Watch / Discover / Create / Messages / Account + Live not available + 13+ + privacy/terms/deletion URLs. It does **not** invent Safety/report/block copy. Safe to save as written.
6. Save the listing. Do not fabricate phone screenshots.

**Error 3 — AI-generated media — STOP for human (see schema above)**

Do not select Yes or No until the operator knows the chevron’s origin.

**Error 1 — App Dashboard/setup remaining steps**

Unknown which cards remain (not OCR). After Full description + AI form, open **Dashboard** / **Publishing overview** and complete only cards that are still marked required. Reuse:

- Ads: `PASTE_ADS.txt` → No ads
- Store settings: `PASTE_SUPPORT_CONTACT.txt`
- Account deletion: skip if already complete; else `PASTE_ACCOUNT_DELETION.txt` → `https://umtuba.com/account-deletion`
- Target audience remainder: `PASTE_TARGET_AUDIENCE_REMAINDER.txt` (do not change ages)
- Content declarations: `PASTE_CONTENT_DECLARATIONS.txt` → all NO
- Data Safety / App access: **do not reopen** unless Console requires

**UGC / IARC — do not paste the v3 NO packets against versionCode 5**

`play-assets/PASTE_UGC.txt` and `PASTE_IARC.txt` say in-app report/block/moderation = NO because they were written for **v3**. Operator state is now **v5 on Alpha**. Local v5/v4 source implements report / block / Terms-before-publish (`umtuba-mobile/release-artifacts/store-listing/UGC_DECLARATION.txt`). Saving the v3 NO answers for a v5 review would be a **false declaration**. If Console requires UGC/IARC now, answer from the **v5 binary behavior**, not from `PASTE_UGC.txt` / `PASTE_IARC.txt`. Do not invent extra tools.

**After the 3 errors clear**

1. Test and release → Closed testing → Alpha → this release
2. Confirm versionCode **5** is the **only** bundle. Do not add v3.
3. Review/save
4. Roll out to **Closed testing only** (not Production)
5. Testers tab: confirm list **UMTUBA Closed Testers** still attached (25 configured)
6. Copy opt-in link
7. Record opted-in count vs 25 configured. Qualifying start = first date Console shows ≥12 opted-in held. 14-day complete = **NO** unless Play says so.

### AI-media evidence inspected (not a Yes/No)

| Source | What it proves |
|--------|----------------|
| `ASSET_MANIFEST.md` / `_inspect.json` | Icon = byte-identical `android-icon-foreground.png`. Feature = flatten of existing graphic. No AI flag. |
| `DESKTOP_A2_PLAY_ASSETS_FINAL_PRODUCTION_PACKAGE_V2.md` | “Existing approved mark” / “same chevron family” / “do not invent a new mark.” No generator named. |
| Repo grep of closeouts for Midjourney / DALL·E / Imagen / “AI-generated” | **No matches.** |
| Visual read of `icon-512x512.png` | Geometric rounded blue chevron on `#050510`. Looks like a vector brand mark. **Not proof.** |
| Visual read of `feature-graphic-1024x500.png` | Same chevron on a construction-grid square (circles / dashed triangle / centerlines) on black. Looks like an icon spec sheet. **Not proof.** |

`AI_ORIGIN_DOCUMENTED = NO`. Therefore declaration = human only.

### Files this continuation

| File | Action |
|------|--------|
| `docs/ops/closeout/DESKTOP_A2_GOOGLE_PLAY_CONSOLE_CLOSEOUT_V1.md` | Appended this continuation |
| `docs/ops/closeout/play-assets/OPERATOR_REMAINING_CLICKS_2026-08-15.txt` | Updated for v5 Alpha + 3 review errors + AI human stop |
| `docs/ai/PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` | **Not overwritten** |

