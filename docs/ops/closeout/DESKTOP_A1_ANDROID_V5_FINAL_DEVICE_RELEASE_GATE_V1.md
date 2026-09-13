# DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1

**DEVICE:** DESKTOP-A1  
**DATE:** 2026-08-15 (this execution ~18:24–18:55 UTC+3)  
**TASK_ID:** DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1  
**PACKAGE:** `com.umtuba.app`  
**CANDIDATE:** `822d893c78505d7db99e892190510cf202cbbc6d` / versionName `1.0.0` / versionCode **5**  
**WEB PRODUCTION SHA (not Android):** `b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089`  
**EVIDENCE DIR:** `docs/ops/closeout/a1-v5-device-qa/`  

No rebuild. No AAB modify. No upload. No commit/push. Shared `docs/ai/{PROJECT_STATE,CURRENT_TASK,CURSOR_REPORT,SESSION_HANDOFF}.md` **not** overwritten. Laptop RETIRED/FROZEN. Server not restarted.

> **HOLD BANNER (2026-08-15 — DESKTOP_A1_ANDROID_V5_RELEASE_DECISION_HOLD_V1)**  
> `CURRENT_V5_ALPHA_ROLLOUT = HOLD`. `V5_FINAL_RELEASE_CANDIDATE = NO`. `VERSION_CODE_5 = OBSOLETE_FOR_FINAL_RELEASE`. `DEVICE_QA = PARTIAL` (this file’s evidence is unchanged). Do **not** rebuild until Central authorizes. Do **not** roll out current v5 Closed Testing. Decision packet: `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_RELEASE_DECISION_HOLD_V1.md`. QA tables and `a1-v5-device-qa/` below are **preserved**.

---

## Return block (this execution)

```
TASK_ID = DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1
STATUS = PARTIAL
ANDROID_SOURCE_SHA = 822d893c78505d7db99e892190510cf202cbbc6d
INSTALLED_VERSION = 1.0.0
INSTALLED_VERSION_CODE = 5
DEVICE = SM-F956B RFCX718LVHK (Galaxy Z Fold6 cover 968x2376, folded)
COLD_LAUNCH = PASS
LOGIN = PARTIAL
SESSION_PERSISTENCE = PASS
WATCH = PASS
PLAYBACK = PASS
SAVED = PASS
SAVE_PERSISTENCE = PARTIAL
FOLLOW_STATE = FAIL
DISCOVER = PARTIAL
MESSAGES = PASS
CREATE = PASS
REAL_UPLOAD = NOT_RUN
UPLOAD_TO_WATCH_PLAYBACK = NOT_RUN
PROFILE = FAIL
ACCOUNT_DELETION = PASS
UGC_REPORT = PASS
UGC_BLOCK = PARTIAL
DELETE_MENU = PARTIAL
BACKGROUND_RESUME = PASS
FOLD_UNFOLD = PARTIAL
CRASH_ANR = PASS
SOURCE_FIX_REQUIRED = YES
NEW_BUILD_REQUIRED = YES
BLOCKERS = installed v5 exhibits Watch-profile target defect (u=eman opened viewer @mohamad); Follow control absent on native Watch; real upload not run (no safe fixture); Central has not authorized a new versionCode
CENTRAL_ACTION_REQUIRED = YES
```

Live: **intentionally unavailable** (`36-live-native.png`). Not a fail.

---

## Summary

USB debugging is authorized. `adb devices -l` shows `RFCX718LVHK device product:q6qxxx model:SM_F956B`. Installed package **is** the v5 candidate: `dumpsys package com.umtuba.app` → `versionName=1.0.0` `versionCode=5` `minSdk=24` `targetSdk=36`. Functional QA ran on the **cover** display (folded). Inner panel `1856x2160` was OFF.

Cold launch after force-stop reached Watch with an existing session (`@mohamad`). Playback advanced (e.g. `0:22/0:28`, `0:32/0:50`). Save star toggled to selected (purple, count 1). Messages list loaded. Create form loaded (Choose video / Terms / Publish disabled). Settings → **Delete account** opened Chrome at `umtuba.com/account-deletion` (request page only; **not submitted**). UGC Safety sheet opened on `@eman` with Report video / Report account / Block account (**not submitted**). Home → relaunch kept PID `26110`. No FATAL/ANR in filtered logcat.

**Device-confirmed defect:** `adb` deep link `umtuba://profile?u=eman` opened the signed-in viewer’s own profile (`@mohamad`, avatar M), not eman. **Shared mobile** (profile screen ignores `u`). Same defect as the uncommitted parent fix. **versionCode 5 / `822d893` is obsolete** for a profile-fix-verified release. Fix already exists on dirty mobile parent. **Not re-applied. Not rebuilt.**

**Follow:** no Follow / Following / Unfollow control on native Watch for `@eman`. Not the same bug as A3 web (web **has** a FOLLOW button; native Watch does not). Class: **Android app gap on this SHA** (control missing). Cannot test “Following not Unfollow.”

Real upload **not** run — Create would publish to production Watch; no dedicated safe fixture used.

---

## 1 — Device / install (before tests)

| Item | Result |
|------|--------|
| `adb devices -l` | `RFCX718LVHK device … model:SM_F956B` (twice) |
| Package | `com.umtuba.app` only |
| `pm path` | `/data/app/~~…/com.umtuba.app-…/base.apk` |
| versionName | **1.0.0** |
| versionCode | **5** |
| targetSdk / minSdk | **36** / **24** |
| installer | `null` (sideload/EAS, not Play) |
| vs candidate | **MATCH** — functional QA proceeded |
| Cover / inner | 968×2376 ON / 1856×2160 OFF |

Evidence: `a1-v5-device-qa/dumpsys-package.txt`, `INSTALLED.txt`.

---

## 2 — Test evidence

| Field | Result | Evidence |
|-------|--------|----------|
| COLD_LAUNCH | **PASS** | force-stop + `am start` → Watch (`03`/`04`). PID 26110. |
| LOGIN | **PARTIAL** | Existing session `@mohamad` used. Signup form **not** exercised. Sign-out dialog seen then cancelled (`11`/`12`). |
| SESSION_PERSISTENCE | **PASS** | Force-stop + cold launch landed on Watch authenticated, not login. Resume after Home kept session. |
| WATCH | **PASS** | Watch tab, `@mohamad` / `@eman` items, rail, tabs (`04`, `26`, `33`). |
| PLAYBACK | **PASS** | Clock advanced (`0:00`→`0:22/0:28`; later `0:32/0:50`, `0:25/0:50`). Auto-next observed. |
| SAVED | **PASS** | Save star selected (purple) count **1** on own video (`06`). Star present on `@eman`. |
| SAVE_PERSISTENCE | **PARTIAL** | Selected star still count 1 after resume (`38`) and later (`39`). No dedicated unsave→kill→relaunch cycle. |
| FOLLOW_STATE | **FAIL** | `@eman` Watch has **no** Follow/Following/Unfollow control (`26`, `27`). Discover World/People = Soon. A3 web Follow-label issue is **different** (web has FOLLOW). |
| DISCOVER | **PARTIAL** | Native Discover opened: spinner “Loading Discover…”, World/People/Hashtags **Soon** (`30`). Did not wait out a full feed. |
| MESSAGES | **PASS** | Thread list: Marina Post + self thread (`31`). |
| CREATE | **PASS** | Form: Choose video, caption 0/1000, Terms checkbox, Publish disabled (`32`). |
| REAL_UPLOAD | **NOT_RUN** | No safe production publish. |
| UPLOAD_TO_WATCH_PLAYBACK | **NOT_RUN** | Depends on upload. |
| PROFILE | **FAIL** | Own profile via header M: `@mohamad` **PASS** (`08`). Other-user: `umtuba://profile?u=eman` → **own** `@mohamad` (`28`). **SHARED mobile.** Makes v5 obsolete. |
| ACCOUNT_DELETION | **PASS** | Settings “Delete account” → Chrome `umtuba.com/account-deletion` (`18`, `19`). Not submitted. |
| UGC_REPORT | **PASS** | Safety sheet `@eman`: Report video / Report account (`34`). Not submitted. |
| UGC_BLOCK | **PARTIAL** | “Block account” on Safety sheet + Settings “Blocked users”. Real block **not** executed. |
| DELETE_MENU | **PARTIAL** | Own-video Delete visible on cover (`06`, `39`); tight vs timeline. Other-user Report label clipped to “Re”/“Rep…” on some frames (`26`, `27`). |
| BACKGROUND_RESUME | **PASS** | HOME then relaunch; same PID 26110; Watch still playing (`37`/`38`). |
| FOLD_UNFOLD | **PARTIAL** | Cover QA only. Inner OFF. Cannot unfold via adb. |
| CRASH_ANR | **PASS** | No crash dialog. Same PID entire session. `logcat-errors.txt` empty for FATAL/ANR/`AndroidRuntime`. |
| Live | OUT_OF_SCOPE | “Live unavailable” (`36`). Not a fail. |
| Network | **PARTIAL** | Airplane icon on; cached Watch kept playing (`39`). No dedicated error banner. Airplane disabled after. |

Chrome web shots (`21`–`24`) were **accidental browser** after deletion URL. **Not** native Discover/Messages/Create. Native results are `30`–`32`.

---

## 3 — Defects (no rebuild)

| Defect | Class | versionCode 5 obsolete? | This session |
|--------|-------|-------------------------|--------------|
| Watch/deep-link `?u=` opens viewer own profile | **SHARED mobile** (destination ignores `u`). Confirmed on device (`28`). | **YES** | Fix already on dirty parent + SMB delta. **Not applied. Not rebuilt.** |
| Follow control missing on native Watch | **Android app gap** on `822d893` (web has FOLLOW). Not A3’s Following-vs-Unfollow label. | Not by itself (separate from profile fix) | No new Follow UI invented. |
| Report label clip on cover | **Android layout** risk (cover 968px). Delete visible but tight. | No | No layout patch. |

A3 web Follow/Saved/login-redirect: Saved **worked** on device (not the web Saved fail). Login form not re-tested. Follow cannot be compared (control absent).

---

## 4 — Exact files changed

- `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1.md` (this file)
- `docs/ai/CURSOR_REPORT_DESKTOP_A1.md`
- `docs/ops/closeout/a1-v5-device-qa/` (dumpsys, screenshots, logcat)

Mobile product files: **none**. `_port_extract`: untouched. Windows Desktop: no writes.

## 5 — Migrations / security

None. No `.env` / passwords printed. Personal email on profile screenshots is in the evidence folder; **not repeated here**. No real deletion, report, block, or production upload submitted.

## 6 — Tests / TS / Build

Device tests as table above. Unit tests / tsc **NOT_RUN** (no product change). **BUILD_PERFORMED = NO.**

## 7 — Open issues / CENTRAL

1. Consume Watch-profile delta; authorize a **new** versionCode. Do not treat `822d893` / versionCode 5 as final.
2. Follow control missing on native Watch — product decision / later SHA.
3. Real upload + unfold QA still needed on a later binary.
4. Do not upload v4. Do not upload current v5 as final.

**STOP.** Do not rebuild. Do not upload.

---

## HOLD banner (appended; QA evidence above not erased)

```
CURRENT_V5_ALPHA_ROLLOUT = HOLD
V5_FINAL_RELEASE_CANDIDATE = NO
VERSION_CODE_5 = OBSOLETE_FOR_FINAL_RELEASE
DEVICE_QA = PARTIAL
SOURCE_FIX_REQUIRED = YES
NEW_BUILD_REQUIRED = YES
REQUESTED_CENTRAL_ACTION = AUTHORIZE minimal source patch for PROFILE + native FOLLOW, then build next Android candidate with VERSION_CODE = 6.
```

Do not rebuild until Central authorizes. Do not roll out current v5 Closed Testing. Full decision: `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_RELEASE_DECISION_HOLD_V1.md`.
