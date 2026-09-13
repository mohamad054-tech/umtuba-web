# DESKTOP_A2_ANDROID_V7_FOLD6_FINAL_GATE_V1

**DEVICE:** DESKTOP-A2 / Galaxy Z Fold6
**DATE:** 2026-08-16
**TASK_ID:** DESKTOP_A2_ANDROID_V7_FOLD6_FINAL_GATE_V1
**PACKAGE:** `com.umtuba.app`
**KIND:** Authorized v7 Fold6 device QA gate. No rebuild. No source change. No Play upload. No Production submit.

Same already-installed v7 candidate (versionCode **7**). Did **not** reinstall. Did **not** treat leftover v6 as v7 evidence.

A1 consume packet: `docs/ops/closeout/DESKTOP_A1_ANDROID_V7_BUILD_EVIDENCE_V1.md`.
Authorized preview APK: `docs/ops/closeout/android-v7-release/apk/umtuba-android-preview-0b160aac.apk`.

```
TASK_ID = DESKTOP_A2_ANDROID_V7_FOLD6_FINAL_GATE_V1
STATUS = COMPLETE
DEVICE = Galaxy Z Fold6
APK_SHA256_VERIFIED = YES
INSTALLED_VERSION = 1.0.0
INSTALLED_VERSION_CODE = 7
REAL_UPLOAD = PASS
PUBLISHED_POST_ID = NOT_EXPOSED_NUMERIC; CAPTION=V7_FOLD6_QA_safe_navy_test_clip_20260816
OPEN_AFTER_UPLOAD = PASS
OPEN_TARGET_EXACT_POST = PASS
UPLOADED_VIDEO_PLAYBACK = PASS
SMOKE_QA = PASS_WITH_NOT_TESTED_FOLD
CRASH_ANR = PASS
DEVICE_QA_RESULT = PASS
NEW_SOURCE_FIX_REQUIRED = NO
ANDROID_V7_DEVICE_GATE = PASS
CLOSED_TESTING_V7_CONTINUATION = AUTHORIZED_FOR_CENTRAL_DECISION
CLOSED_TESTING_V7 = NOT_PERFORMED
PRODUCTION_SUBMISSION = NO
PLAY_CONSOLE = NOT_TOUCHED
```

---

## FINAL RETURN

```
TASK_ID = DESKTOP_A2_ANDROID_V7_FOLD6_FINAL_GATE_V1
STATUS = COMPLETE
DEVICE = Galaxy Z Fold6
APK_SHA256_VERIFIED = YES
INSTALLED_VERSION = 1.0.0
INSTALLED_VERSION_CODE = 7
REAL_UPLOAD = PASS
PUBLISHED_POST_ID = NOT_EXPOSED_NUMERIC; CAPTION=V7_FOLD6_QA_safe_navy_test_clip_20260816
OPEN_AFTER_UPLOAD = PASS
OPEN_TARGET_EXACT_POST = PASS
UPLOADED_VIDEO_PLAYBACK = PASS
SMOKE_QA = PASS_WITH_NOT_TESTED_FOLD
CRASH_ANR = PASS
DEVICE_QA_RESULT = PASS
NEW_SOURCE_FIX_REQUIRED = NO
ANDROID_V7_DEVICE_GATE = PASS
CLOSED_TESTING_V7_CONTINUATION = AUTHORIZED_FOR_CENTRAL_DECISION
CLOSED_TESTING_V7 = NOT_PERFORMED
PRODUCTION_SUBMISSION = NO
PLAY_CONSOLE = NOT_TOUCHED
```

A2 did **not** upload to Play and did **not** submit Production. Closed Testing v7 is a **Central decision** only.

---

## What was done (this continuation)

1. Operator said Fold6 was reconnected and unlocked.
2. `adb devices -l` → `RFCX718LVHK device product:q6qxxx model:SM_F956B device:q6q transport_id:1`.
3. dumpsys `com.umtuba.app`: `versionName=1.0.0` `versionCode=7`. **MATCH.** Did **not** reinstall. Did **not** rebuild.
4. Existing session still `@mohamad` on Watch (wallet **230 UM · Rising**). Treated as the safe test session.
5. Primary gate on the same installed v7: Create → selected MediaStore clip `1000442357.mp4` (the pushed 3s navy QA file) → caption `V7_FOLD6_QA_safe_navy_test_clip_20260816` → UGC checkbox → Publish → **Video published.** → **Open Watch**.
6. Open landed on the **exact** new post (navy 3s, unique caption, owner Delete). Clock observed at `0:01/0:03` then later `0:00/0:03`. Auto-next later advanced the feed; that is not an Open miss.
7. Targeted smoke ran only after primary PASS. Fold/unfold was **not** physically performed.

---

## APK / install (unchanged this pass)

| Field | Result |
|---|---|
| APK_PATH | `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-release\apk\umtuba-android-preview-0b160aac.apk` |
| APK_SHA256 | `AE94E1E7191211AA25C6964562ABC7046CA5B6956615F789042B4E568F8818B7` |
| APK_SHA256_VERIFIED | **YES** (prior pass; same file) |
| PREVIEW_BUILD_ID | `0b160aac` |
| Reinstall this pass | **NO** (package present, versionCode 7) |
| INSTALLED_VERSION_NAME | `1.0.0` |
| INSTALLED_VERSION_CODE | **7** |
| minSdk / targetSdk | 24 / 36 |

Evidence: `dumpsys-package-gate.txt`, `adb-devices-gate.txt`, `adb-devices-final.txt`.

---

## Device identity (this pass)

Exact `adb devices -l` (gate start and end):

```
List of devices attached
RFCX718LVHK            device product:q6qxxx model:SM_F956B device:q6q transport_id:1
```

Cover UI **968×2376** (folded). Inner panel `1856×2160` present in dumpsys with **Display State=OFF**. Multi-display screencap warning is expected.

---

## PRIMARY RELEASE GATE — PASS

Safe clip: generated navy 3s + 440 Hz tone `umtuba-v7-qa-safe-clip.mp4` (35440 bytes) already on device as `/sdcard/DCIM/Camera/umtuba-v7-qa-safe-clip.mp4`, MediaStore `_id=1000442357`.

| Field | Result | Evidence |
|---|---|---|
| REAL_UPLOAD | **PASS** | Create success: **Video published.** + Open Watch. `26-published-success.png` |
| PUBLISHED_POST_ID | Caption-identified; numeric ID **not** in UI or app logcat | Caption `V7_FOLD6_QA_safe_navy_test_clip_20260816` (two extra Arabic glyphs from IME). `27-after-open.png`, `31-swipe-prev-05-ui.xml` |
| OPEN_AFTER_UPLOAD | **PASS** | Tapped **Open Watch** (not the Watch tab). Immediate next frame is Watch. `27-after-open.png` |
| OPEN_TARGET_EXACT_POST | **PASS** | First Watch card is the new navy 3s post with that exact caption, `@mohamad`, owner **Delete**. Not a generic older clip. |
| UPLOADED_VIDEO_PLAYBACK | **PASS** | Same clip clock `0:01/0:03` (`27-after-open.png`, `31-swipe-prev-05.png`) and `0:00/0:03` (`33-navy-playing.png`) |

v6 defect was Open → generic Watch (dropped `postId`). This v7 Open landed on the **newly published** clip. Auto-next later moved to other `@mohamad` videos (`28`/`29` books 2:39). That is feed advance, not Open failure. Swipe-previous recovered the navy clip (`31-swipe-prev-05`).

Picker showed duration `3000s` for the 3s file (Photos metadata). Publish still succeeded. Display-only; not a gate fail.

---

## TARGETED SMOKE — after primary PASS

| Item | Result | Evidence / notes |
|---|---|---|
| cold launch | **PASS** | `am force-stop` then `am start`. New PID `27965` (was `13125`). `58-cold-launch.png` Loading Watch; then session Watch. |
| session | **PASS** | Still `@mohamad` / **230 UM · Rising** after cold start. `60-cold-watch-loaded.png` |
| Watch | **PASS** | Feed, Auto-next, Mute, volume, cards load. |
| playback | **PASS** | Clocks advance on own and other clips (navy 0:00–0:01/0:03; other 0:35/1:01, 0:02/0:12). |
| Create | **PASS** | Form, picker, caption, UGC checkbox, Publish. |
| upload | **PASS** | Same as primary REAL_UPLOAD. |
| Saved | **PASS** (toggle) | Star on navy clip went purple, count **0 → 1**. `34-save-toggled.png`. Dedicated Saved **list** screen **NOT_FOUND** on Profile/Discover. |
| other-user Profile | **PASS** | Watch handle `@marenapost` opened **that** profile (not viewer `@mohamad`). `50-other-profile.png`. v5 target defect **not** reproduced on v7. |
| Follow | **PASS** | `@marenapost` Follow → **Following**. `49-after-refollow-ui.xml` |
| Following | **PASS** | Control showed **Following** while followed. `46-other-user-watch-ui.xml` |
| unfollow | **PASS** | Following → **Follow**. `48-after-unfollow-ui.xml` |
| Messages | **PASS** | Inbox loaded (two conversations). `43-messages.png` |
| Back arrows | **PASS** | Chrome deletion page → Profile; other Profile → same Watch card. `38-after-delete-back`, `51-back-from-other-profile` |
| account deletion entry | **PASS** | Settings → Delete account opened Chrome `umtuba.com/account-deletion`. **Not submitted.** `37-delete-account-entry.png` |
| UGC report | **PASS** (entry) | Safety sheet → Report video reasons. **Not submitted.** `52-ugc-sheet.png`, `53-ugc-report-entry.png` |
| UGC block | **PASS** (entry) | Block confirm for `@marenapost`. **Cancelled. Not confirmed.** `54-ugc-block-entry.png` |
| background/resume | **PASS** | HOME then `am start`. Same PID `13125`. Returned to Watch `@marenapost`. `56`/`57` |
| crash/ANR | **PASS** | No crash dialog. `logcat -b crash` empty. No `FATAL EXCEPTION` / `ANR in com.umtuba` in filtered logcat. |
| fold/unfold | **NOT_TESTED** | Device stayed folded. Cover `968x2376` ON; inner `1856x2160` OFF. No physical unfold this session. |

`SMOKE_QA = PASS_WITH_NOT_TESTED_FOLD`. Fold/unfold is the only untested smoke row. Not fabricated PASS.

---

## CRASH / STABILITY

`CRASH_ANR = PASS` for this session: no crash UI, empty crash buffer, no ANR/FATAL hits in the filter file (`logcat-crash.txt`, `logcat-anr-filter.txt`).

---

## Play / Production

| Field | Result |
|---|---|
| PLAY_CONSOLE | **NOT_TOUCHED** |
| AAB_UPLOAD | **NO** |
| CLOSED_TESTING_V7 | **NOT_PERFORMED** |
| CLOSED_TESTING_V7_CONTINUATION | **AUTHORIZED_FOR_CENTRAL_DECISION** |
| PRODUCTION_SUBMISSION | **NO** |

---

## Source / rebuild

| Field | Result |
|---|---|
| SOURCE_MODIFIED | **NO** |
| REBUILD_PERFORMED | **NO** |
| NEW_SOURCE_FIX_REQUIRED | **NO** |
| V7_SOURCE_SHA (reference) | `320424717cd02646a9e586754f41649b9ac55cd7` |
| OPEN_AFTER_UPLOAD_FIX_ANCESTOR | `7841b726` |

---

## Evidence paths

Under `docs/ops/closeout/android-v7-fold6-qa/`:

- `adb-devices-gate.txt`, `adb-devices-final.txt`, `dumpsys-package-gate.txt`
- `26-published-success.png` — Video published + Open Watch
- `27-after-open.png` — Open landed on navy 3s exact caption, clock `0:01/0:03`
- `31-swipe-prev-05.png` / `-ui.xml` — same post recovered; caption in dump
- `33-navy-playing.png`, `34-save-toggled.png`
- `35-own-profile.png`, `36-settings.png`, `37-delete-account-entry.png`
- `43-messages.png`
- `46-other-user-watch.png`, `48-after-unfollow`, `49-after-refollow`
- `50-other-profile.png` (`@marenapost`)
- `52-ugc-sheet.png`, `53-ugc-report-entry.png`, `54-ugc-block-entry.png`
- `56-background-home.png`, `57-resume.png`
- `58-cold-launch.png`, `60-cold-watch-loaded.png`
- `logcat-crash.txt`, `logcat-anr-filter.txt`, `wm-size.txt`, `display-state.txt`
- `umtuba-v7-qa-safe-clip.mp4`, `capture.ps1`

Packet: `docs/ops/closeout/DESKTOP_A2_ANDROID_V7_FOLD6_FINAL_GATE_V1.md`

---

## Open issues / Central only

1. Numeric `PUBLISHED_POST_ID` is not exposed in accessibility UI or React Native logcat. Exact-post proof is the unique caption + 3s navy playback.
2. Fold/unfold **NOT_TESTED** (phone stayed folded).
3. Saved **list** screen not found; star toggle works.
4. Closed Testing v7 is **authorized for Central decision** only. A2 must not upload or click Play.
5. Production submit remains forbidden.
