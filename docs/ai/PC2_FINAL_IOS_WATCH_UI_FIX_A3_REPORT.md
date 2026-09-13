# PC2 FINAL iOS WATCH UI FIX — A3 surgical device QA

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_FINAL_IOS_WATCH_UI_FIX_A3_V1
DATE = 2026-08-17
WAVE = PC2_FINAL_IOS_WATCH_UI_FIX_WAVE
PHASE = WAITING_OPERATOR_INSTALL
MODE = SURGICAL_QA / WAITING_FOR_BUILD8_INSTALL
DEVICE = iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 8
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
BUILD_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
IOS_BUILD_NUMBER = 8
EAS_BUILD_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
BUILD_RESULT = FINISHED
TESTFLIGHT_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = NOT_INSTALLED
IPHONE13_INSTALL = NOT_STARTED
REPLACEMENT_BUILD_INSTALLED = NO
BUILD7_RETESTED_AS_REPLACEMENT = NO
DEVICE_QA_EXECUTED = NO
SURGICAL_DEVICE_QA = WAITING_OPERATOR_INSTALL
IOS_FINAL_WATCH_UI_GATE = NOT_PASS
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = YES
```

A2 finished. Internal TestFlight lists **UMTUBA 1.0.0 (8)** from
`658936e`. This track has **not** confirmed that binary on the
physical iPhone 13. No surgical check may leave `NOT_TESTED` until
the operator confirms `تم تثبيت 8`.

Do **not** test Build 7. Do **not** invent PASS. Do **not** Submit
for Review / Production.

---

## Current status (this turn)

```text
DEVICE = iPhone 13
TESTFLIGHT_BUILD = NOT_INSTALLED
LOWER_RIGHT_TEXT_OVERLAP = NOT_TESTED
RTL_PROGRESS_BAR = NOT_TESTED
LTR_PROGRESS_BAR = NOT_TESTED
VIDEO_DURATION_DISPLAY = NOT_TESTED
PLAYBACK_UNAFFECTED = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
SURGICAL_DEVICE_QA = WAITING_OPERATOR_INSTALL
IOS_FINAL_WATCH_UI_GATE = NOT_PASS
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD8_INSTALL_CONFIRMATION
```

Do **not** upgrade any result field this turn.

---

## Operator action (this turn — install only)

```text
OPERATOR_DEVICE = iPhone 13
OPERATOR_ACTION = افتح تطبيق TestFlight وثبّت أو حدّث UMTUBA إلى 1.0.0 (8). بعد الانتهاء اكتب: تم تثبيت 8
WHY_REQUIRED = الفحص الجراحي يحتاج البناء 8 على الآيفون. البناء 7 ممنوع.
```

One action. Wait for `تم تثبيت 8` before any Watch / Create check.

If TestFlight still shows **(7)** or older: do not install that
build. Reply `TESTFLIGHT_STILL_SHOWS_BUILD_7` (or `_6` / `_5`).

---

## Authorized checks (after `تم تثبيت 8` only)

1. Lower-right Watch overlap
2. RTL progress bar
3. LTR progress bar
4. Selected-video duration on Create select (`IMG_0008.MOV` → ~8s,
   not 8200s). Do **not** publish.
5. One representative Watch playback

Out of scope unless new regression evidence appears: full
localization, RTL Back, Saved, Follow, Messages, Session,
Background/Resume, Create-upload, Open-after-upload.

---

## Gate close (not this turn)

```text
IOS_FINAL_WATCH_UI_GATE = PASS
APP_STORE_FINAL_GATE_READY = YES
```

only after iPhone 13 + **1.0.0 (8)** physically records:

- `LOWER_RIGHT_TEXT_OVERLAP = PASS`
- `RTL_PROGRESS_BAR = PASS`
- `LTR_PROGRESS_BAR = PASS`
- `VIDEO_DURATION_DISPLAY = PASS`
- `PLAYBACK_UNAFFECTED = PASS`

Until all three original defects physically PASS:

```text
IOS_FINAL_WATCH_UI_GATE = NOT_PASS
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
```

---

## What was not done (by design)

- No device QA / no PASS invented
- Build 7 not retested as Build 8
- No App Store Production submit
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten

---

## Return fields (this turn)

```text
OPERATOR_DEVICE = iPhone 13
OPERATOR_ACTION = افتح تطبيق TestFlight وثبّت أو حدّث UMTUBA إلى 1.0.0 (8). بعد الانتهاء اكتب: تم تثبيت 8
WHY_REQUIRED = الفحص الجراحي يحتاج البناء 8 على الآيفون. البناء 7 ممنوع.
TESTFLIGHT_BUILD = NOT_INSTALLED
SURGICAL_DEVICE_QA = WAITING_OPERATOR_INSTALL
IOS_FINAL_WATCH_UI_GATE = NOT_PASS
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD8_INSTALL_CONFIRMATION
```
