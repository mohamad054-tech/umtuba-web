# DESKTOP_ANDROID_V6_RELEASE_EXECUTION_V1

**DEVICE:** DESKTOP-A3  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_ANDROID_V6_RELEASE_EXECUTION_V1  
**PACKAGE:** `com.umtuba.app`  
**KIND:** Build + Fold6 QA + Closed Testing upload attempt. No commit. No Production submit. No v5 rollout.

A1 PASS consumed immediately. Built only from accepted v6 SHA. Did not build `822d893` / versionCode 5. Did not publish v5. Production submission not performed.

```
V6_SOURCE_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
EAS_BUILD_ID = 5c3493cb-ae5f-4065-ad61-3605a9887bd2
BUILD_RESULT = PASS
AAB_VERSION_CODE = 6
FOLD6_INSTALLED_VERSION_CODE = 6
PROFILE_OTHER_USER = PASS
PROFILE_OWN = PASS
FOLLOW = PASS
FOLLOWING = PASS
UNFOLLOW = PASS
FOLLOW_PERSISTENCE = PASS
LOGIN = PARTIAL
SAVE_PERSISTENCE = PARTIAL
DISCOVER = PARTIAL
UGC_BLOCK = PARTIAL
DELETE_MENU = PASS
FOLD_UNFOLD = PARTIAL
REAL_UPLOAD = NOT_RUN
UPLOAD_TO_WATCH_PLAYBACK = NOT_RUN
SMOKE_REGRESSION = PARTIAL
CRASH_ANR = PASS
DEVICE_QA_RESULT = PASS
V6_PLAY_UPLOAD = NOT_PERFORMED
PLAY_RECOGNIZED_VERSION_CODE = UNKNOWN
CLOSED_TESTING_ROLLOUT = NOT_PERFORMED
TESTER_LIST = UMTUBA Closed Testers (existing; not re-OCR)
CONFIGURED_TESTERS = 25 (configured; listed ≠ opted-in)
OPT_IN_LINK = UNKNOWN
QUALIFYING_PERIOD_START = UNKNOWN
QUALIFYING_TESTERS = UNKNOWN
PRODUCTION_SUBMISSION = NO
ANDROID_RELEASE_BLOCKERS = Play Console not writable from Cursor browser (tab vanish ×2). Operator must upload the v6 AAB to Alpha / Closed Testing and abandon held v5. Public profile fetch for @eman failed after target resolved (not the v5 viewer-profile bug). Discover/Create/Messages/Account-deletion screens not recaptured after Fold6 lock.
CENTRAL_ACTION_REQUIRED = YES
```

---

## Phase 0 / 1 — source verify (A1 PASS consumed)

| Check | Result |
|-------|--------|
| Packet | `docs/ops/closeout/DESKTOP_ANDROID_V6_MINIMAL_SOURCE_FIX_V1.md` |
| Worktree | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6` |
| `git rev-parse HEAD` | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` |
| Working tree | clean |
| versionName | `1.0.0` |
| versionCode in `app.config.ts` | **6** |
| PROFILE_FIX / NATIVE_FOLLOW_FIX (A1) | YES / YES |
| Stale `822d893` used | **NO** |

Fold6 at prep: `RFCX718LVHK device product:q6qxxx model:SM_F956B`. USB debugging authorized. Then installed v5 (`versionCode=5`); replaced by v6 below.

Approved EAS path reused (not invented): `npx eas-cli build --platform android --profile production --non-interactive` from that worktree. Device APK companion (same SHA + same remote keystore `p6De1DDtE_`) reused the v5 pattern: `npx eas-cli build --platform android --profile preview --non-interactive`.

Staging (repo only, not Desktop):

- `docs/ops/closeout/android-v6-release/aab/`
- `docs/ops/closeout/android-v6-release/apk/`
- `docs/ops/closeout/android-v6-release/evidence/`
- `docs/ops/closeout/a3-v6-device-qa/`

---

## Phase 2 — EAS production build

| Field | Value |
|-------|--------|
| Command | `npx eas-cli build --platform android --profile production --non-interactive` |
| CWD | A1 v6 worktree @ `f1dbd1cc` |
| Remote increment | versionCode **5 → 6** |
| Keystore | existing remote `p6De1DDtE_` (default). Not rotated |
| EAS_BUILD_ID | `5c3493cb-ae5f-4065-ad61-3605a9887bd2` |
| Status | FINISHED / exit 0 |
| gitCommitHash (EAS) | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` |
| versionName | `1.0.0` |
| versionCode | **6** |
| Distribution | STORE |
| AAB path | `docs/ops/closeout/android-v6-release/aab/umtuba-android-production-5c3493cb.aab` |
| AAB bytes | `102265891` |
| AAB SHA256 | `17775D73434A16243496EEDCAB724C9960106DB73BF89134AB9B7CF00E652E67` |
| bundletool dump | package `com.umtuba.app` / versionName `1.0.0` / versionCode **6** |
| Manual AAB modification | **NO** |
| Play upload this session | **NO** |

Device APK (same SHA / same keystore; Fold6 sideload only):

| Field | Value |
|-------|--------|
| EAS id | `6a948536-7d5e-4406-8670-304bf7a1ff98` |
| Profile | preview / INTERNAL |
| versionCode | **6** |
| SHA | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` |
| Path | `docs/ops/closeout/android-v6-release/apk/umtuba-android-preview-6a948536.apk` |
| SHA256 | `69E059CE129C46D9DACACE6219E93CDC327AAC0FEA0A0344830892CDB0912D66` |
| Play upload | **NO** |

Metadata: `android-v6-release/evidence/eas-build-5c3493cb.json`, `eas-build-6a948536.json`.

`BUILD_RESULT = PASS`

---

## Phase 3 — Fold6 install + QA

`adb install -r` of the preview APK **Success**.

`dumpsys package com.umtuba.app` after install and again at session end:

- versionName `1.0.0`
- versionCode **6**
- minSdk 24 / targetSdk 36
- serial `RFCX718LVHK` / SM-F956B cover 968×2376

`FOLD6_INSTALLED_VERSION_CODE = 6` — QA proceeded.

Evidence dir: `docs/ops/closeout/a3-v6-device-qa/` (`INSTALLED.txt`, `dumpsys-package.txt`, screenshots).

### Mandatory

| Field | Result | Evidence |
|-------|--------|----------|
| PROFILE_OTHER_USER | **PASS** (target) | `umtuba://profile?u=eman` opened Profile for **@eman**, not viewer `@mohamad` (`03-profile-eman-deeplink.png`). v5 blocker (viewer profile) is gone. Public fetch then showed “Profile unavailable / We couldn’t load @eman” after Retry ×2 (`03b`, `03c`). Residual load miss — not the old target bug. |
| PROFILE_OWN | **PASS** | Header M → `@mohamad` / mohamad abu tair / Settings (`07-own-profile-M.png`) |
| FOLLOW | **PASS** | `@eman` Watch shows **Follow** (`12-follow-before.png`, `09-paused-ui.xml` button bounds `[204,1605][361,1689]`) |
| FOLLOWING | **PASS** | After tap, label **Following** (`13-following-after.png`) |
| UNFOLLOW | **PASS** | Tap on Following returned **Follow** (`15-unfollow.png`) |
| FOLLOW_PERSISTENCE | **PASS** | Force-stop + relaunch + swipe back to `@eman` still **Following** (`14-follow-persist.png`) |
| LOGIN | **PARTIAL** | Existing session `@mohamad` used. Signup/sign-in form not exercised |
| SAVE_PERSISTENCE | **PARTIAL** | Save star selected (count 1) on own and eman clips across relaunch. No dedicated unsave cycle |
| DISCOVER | **PARTIAL** | Tab present on Watch. Dedicated Discover screen not recaptured after Fold6 lock |
| UGC_BLOCK | **PARTIAL** | Report control present on `@eman`. Block not executed |
| DELETE_MENU | **PASS** | Own clips show Delete (`02-watch-loaded.png`, `08-swipe-6.png`). Other-user `@eman` has Report, not Delete (`12-follow-before.png`) |
| FOLD_UNFOLD | **PARTIAL** | Cover QA only. Inner panel not unfolded via adb |
| REAL_UPLOAD | **NOT_RUN** | No safe production Watch fixture. Create would publish live |
| UPLOAD_TO_WATCH_PLAYBACK | **NOT_RUN** | Depends on upload |

### Smoke

| Field | Result | Evidence |
|-------|--------|----------|
| COLD_LAUNCH | **PASS** | monkey launcher → Watch (`01` / `02`) |
| SESSION_PERSISTENCE | **PASS** | Force-stop relaunch landed authenticated Watch, not login (`14`) |
| WATCH | **PASS** | Feed, `@mohamad` / `@eman`, rail |
| PLAYBACK | **PASS** | Clocks advanced (e.g. `0:20/0:28`, `0:12/0:50`) |
| SAVED | **PASS** | Star selected count 1 |
| MESSAGES | **PARTIAL** | Tab present. Screen not recaptured after lock |
| CREATE | **PARTIAL** | Tab present. Form not recaptured after lock |
| ACCOUNT_DELETION | **PARTIAL** | Settings row on own Profile (`07`). Delete-account URL not opened this session |
| UGC_REPORT | **PARTIAL** | Report on `@eman` Watch. Safety sheet not captured (lock) |
| BACKGROUND_RESUME | **PARTIAL** | Force-stop resume PASS. HOME→relaunch after lock not evidenced |
| CRASH_ANR | **PASS** | No crash dialog. Filtered logcat has no FATAL/ANR/`AndroidRuntime` (`logcat-errors.txt`) |
| Live | OUT_OF_SCOPE | Intentionally unavailable. Not a fail |

`DEVICE_QA_RESULT = PASS` for the authorized release gates: installed versionCode 6, other-user profile **target**, native Follow → Following → unfollow + persistence. No release-blocking product failure on those gates. Residual: `@eman` public profile fetch; late-session lock blocked some smoke recaptures.

---

## Phase 4 — Closed Testing upload

Upload was **authorized** by the device gates. Cursor Play Console **could not be driven**:

1. `browser_navigate` `https://play.google.com/console` → `No browser tab available`
2. One retry: `browser_tabs` new (`viewId=57a3fa` `about:blank`) → lock/navigate → tab vanished (`No browser tab available`)

Stopped. No third MCP loop. System browser was launched for the human (`Start-Process https://play.google.com/console`).

`eas submit` was **not** used (`eas.json` submit is not Closed Testing Alpha).

| Field | Result |
|-------|--------|
| V6_PLAY_UPLOAD | **NOT_PERFORMED** |
| PLAY_RECOGNIZED_VERSION_CODE | **UNKNOWN** |
| CLOSED_TESTING_ROLLOUT | **NOT_PERFORMED** |
| v5 abandoned on Play | **NOT_CONFIRMED** (operator must replace/abandon held v5) |
| TESTER_LIST | existing **UMTUBA Closed Testers** — do not create a new list |
| CONFIGURED_TESTERS | **25** configured (listed ≠ opted-in) |
| OPT_IN_LINK | **UNKNOWN** |
| QUALIFYING_PERIOD_START | **UNKNOWN** |
| QUALIFYING_TESTERS | **UNKNOWN** (must be read from Console Opted-in, not 25) |
| PRODUCTION_SUBMISSION | **NO** |

### Operator click path (Chrome or Edge as Play developer)

AAB (do not modify):

`C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v6-release\aab\umtuba-android-production-5c3493cb.aab`

SHA256 `17775D73434A16243496EEDCAB724C9960106DB73BF89134AB9B7CF00E652E67`  
EAS `5c3493cb-ae5f-4065-ad61-3605a9887bd2` / versionName `1.0.0` / versionCode **6** / SHA `f1dbd1cc`

1. Open **https://play.google.com/console** → UMTUBA / `com.umtuba.app`
2. **Test and release → Testing → Closed testing → Manage track (Alpha)**
3. Create or continue a release. **Upload the v6 AAB above**
4. **Replace / abandon the held v5** preparation. Do **not** roll out v5. Do **not** put versionCode 3 or 5 back as the active Closed Testing bundle
5. Confirm Play shows **versionCode 6** as the bundle
6. Testers tab: keep list **UMTUBA Closed Testers** attached. Preserve all **25** configured testers. Do not create a new list
7. Review / save. **Roll out to Closed Testing / Alpha only**
8. Copy the **opt-in link** (appears only when the Closed Testing release is Published)
9. Record **opted-in / qualifying count separately from configured 25**, and the qualifying-period start Play shows
10. **Do not Apply / submit Production**

If Play still blocks on listing errors (full description / AI-generated media / dashboard cards), clear those first using existing `docs/ops/closeout/play-assets/` paste files. Do **not** paste v3 UGC/IARC “NO” answers against this v6 binary (report/block/terms exist).

---

## Security

- No secrets, tokens, `.env` values, tester emails, or keystore passwords in this packet
- EAS env names only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- Signed artifact URLs not stored
- `_port_extract` not touched
- Windows Desktop not written
- No commit / push / force
- Laptop RETIRED/FROZEN — no external web server restart

---

## Files written this task

- `docs/ops/closeout/DESKTOP_ANDROID_V6_RELEASE_EXECUTION_V1.md` (this file)
- `docs/ops/closeout/android-v6-release/aab/umtuba-android-production-5c3493cb.aab`
- `docs/ops/closeout/android-v6-release/apk/umtuba-android-preview-6a948536.apk`
- `docs/ops/closeout/android-v6-release/evidence/*`
- `docs/ops/closeout/a3-v6-device-qa/*`

`docs/ai/PROJECT_STATE.md`, `CURRENT_TASK.md`, `CURSOR_REPORT.md`, `SESSION_HANDOFF.md` **not** overwritten.

---

## FINAL RETURN

```
V6_SOURCE_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
EAS_BUILD_ID = 5c3493cb-ae5f-4065-ad61-3605a9887bd2
BUILD_RESULT = PASS
AAB_VERSION_CODE = 6
FOLD6_INSTALLED_VERSION_CODE = 6
PROFILE_OTHER_USER = PASS
PROFILE_OWN = PASS
FOLLOW = PASS
FOLLOWING = PASS
UNFOLLOW = PASS
FOLLOW_PERSISTENCE = PASS
LOGIN = PARTIAL
SAVE_PERSISTENCE = PARTIAL
DISCOVER = PARTIAL
UGC_BLOCK = PARTIAL
DELETE_MENU = PASS
FOLD_UNFOLD = PARTIAL
REAL_UPLOAD = NOT_RUN
UPLOAD_TO_WATCH_PLAYBACK = NOT_RUN
SMOKE_REGRESSION = PARTIAL
CRASH_ANR = PASS
DEVICE_QA_RESULT = PASS
V6_PLAY_UPLOAD = NOT_PERFORMED
PLAY_RECOGNIZED_VERSION_CODE = UNKNOWN
CLOSED_TESTING_ROLLOUT = NOT_PERFORMED
TESTER_LIST = UMTUBA Closed Testers
CONFIGURED_TESTERS = 25
OPT_IN_LINK = UNKNOWN
QUALIFYING_PERIOD_START = UNKNOWN
QUALIFYING_TESTERS = UNKNOWN
PRODUCTION_SUBMISSION = NO
ANDROID_RELEASE_BLOCKERS = Cursor Play Console tab vanish ×2 — operator must upload v6 AAB to Alpha/Closed Testing and abandon held v5. @eman public profile fetch failed after correct target. Some smoke screens missed after Fold6 lock.
CENTRAL_ACTION_REQUIRED = YES
```
