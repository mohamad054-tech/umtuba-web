# PC2 iOS USER-REPORTED DEFECT PARITY REPRO

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_USER_REPORTED_DEFECT_PARITY_REPRO_V1
DATE = 2026-08-17
MODE = REAL_DEVICE_REPRO_ONLY
DEVICE = iPhone 13
PHYSICAL_DEVICE = iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
CURRENT_TESTFLIGHT_BUILD = 8
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
SOURCE_CHANGED = NO
BUILD_CREATED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
LOCAL_FIX_IMPLEMENTED = NO
```

Hard rules this task: no shared-fix implementation, no rebuild, no
App Store Production submit, no fabricated PASS/FAIL. Physical-device
evidence only. One operator action per turn. Simple Arabic. Exact tap.

---

## Item 1 — Create previous-upload state reset — FAIL

Physical iPhone 13 + Build **1.0.0 (8)**. Operator evidence recorded
this turn. No local fix. Selection not cleared.

```text
ITEM = 1
ITEM_TITLE = CREATE_PREVIOUS_UPLOAD_STATE_RESET
STATUS = FAIL
CREATE_PREVIOUS_UPLOAD_STATE_RESET = FAIL
IOS_REPRODUCED = YES
CREATE_OPENED_ON_BUILD8 = YES
PREVIOUS_ASSET_STILL_SELECTED = YES
CREATE_STARTS_CLEAN = NO
CAPTION = EMPTY
TERMS = UNCHECKED
SUCCESS_MESSAGE = NONE
PUBLISH_THIS_TURN = NO
SELECTION_CLEARED = NO
```

Fresh Create still contains the previous asset:

```text
FIRST_ASSET_IDENTITY = IMG_0008.MOV
FIRST_ASSET_SIZE = 9.5_MB
FIRST_ASSET_DURATION_LABEL = 8s
FIRST_ASSET_TYPE = video/quicktime
FIRST_PUBLISH_RESULT = NOT_CAPTURED_THIS_ITEM
SECOND_CREATE_INITIAL_STATE = LEFTOVER_PREVIOUS_ASSET_SELECTED
LEFTOVER_FILENAME = IMG_0008.MOV
LEFTOVER_DURATION = 8s
LEFTOVER_CAPTION = EMPTY
LEFTOVER_TERMS = UNCHECKED
LEFTOVER_SUCCESS_STATE = NONE
```

Matches Android user-reported class. Likely shared. Pending Central
source confirmation. Do **not** treat this as a local-fix mandate.

Do **not** clear the leftover selection. Operator said do not clear.

---

## Item 2 — Invalid long-video publish / retry — IN PROGRESS

```text
ITEM = 2
ITEM_TITLE = INVALID_LONG_VIDEO_PUBLISH_RETRY
STATUS = WAITING_OPERATOR_SELECT_LONG_VIDEO
PUBLISH_THIS_TURN = NO
PICK_THIS_TURN = YES_ONE_LONG_VIDEO_ONLY
HOP = SELECT_SAFE_OVER_DURATION_VIDEO
```

Picker-open evidence (operator, physical iPhone 13 + Build 8).
Item 2 as a whole is **not** PASS.

```text
IOS_VIDEO_PICKER_OPEN = PASS
SYSTEM_PICKER = iOS_NATIVE_VIDEO_PICKER
PERMISSION_ERROR = NONE
NO_NEW_VIDEO_SELECTED_YET = YES
STALE_CREATE_ASSET_PRESERVED = YES
STALE_ASSET = IMG_0008.MOV
```

Verify later (not all this turn):

- duration detected correctly
- validation message
- Publish enabled/disabled
- Retry behavior
- Retry must NEVER target a stale previously uploaded asset
- Do not publish an unwanted/invalid video

Capture later (not this turn — long video not selected yet):

```text
LONG_VIDEO_IDENTITY = NOT_CAPTURED
LONG_VIDEO_DURATION_DETECTED = NOT_TESTED
VALIDATION_MESSAGE = NOT_TESTED
PUBLISH_ENABLED_ON_INVALID = NOT_TESTED
RETRY_BEHAVIOR = NOT_TESTED
RETRY_TARGETED_STALE_ASSET = NOT_TESTED
```

App max duration from source `658936e`: **NOT CONFIRMED** in this
web checkout. Mobile `create.tsx` / `pickVideo.ts` are not present.
Shared `lib/supabase/videoPostsShared.ts` has `MAX_VIDEO_BYTES` =
50 MB only — no duration ceiling. No 60s / 3 min invented.

This turn: operator is **in** the picker. Tap the longest available
video (several minutes if one exists). Stop. Do not tap نشر. Write
name/duration if shown, warning yes/no, Publish disabled/enabled.

---

## Operator action (this turn — item 2 hop 2 only)

```text
OPERATOR_DEVICE = iPhone 13
OPERATOR_ACTION = اضغط أطول فيديو عندك (عدة دقائق إن وُجد). لا تضغط نشر. اكتب: اسم/مدة الفيديو إن ظهرت، هل ظهرت رسالة تحذير، هل زر نشر معطّل أم مفعّل.
WHY_REQUIRED = نختبر فيديو أطول من حد التطبيق. حد المدة غير مؤكد من المصدر هنا. لا تنشر.
```

Items 3–8 are not started. Do not dump them on the operator.

---

## Gates (unchanged this turn)

```text
SOURCE_CHANGED = NO
BUILD_CREATED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
SHARED_MOBILE_SHA = NOT_SUPPLIED
LOCAL_FIX_IMPLEMENTED = NO
```

If Central later supplies one authoritative shared mobile SHA: stop
and return it to the operator before any build. Do not choose or
manufacture that SHA.

---

## What was not done (by design)

- No code change / no local fix
- Leftover `IMG_0008.MOV` selection not cleared
- No rebuild
- No TestFlight re-upload
- No App Store Production submit
- No publish
- Long-video pick requested this turn; not yet executed
- Items 3–8 not started
- `docs/ai/CURSOR_REPORT.md` not overwritten
- No PASS invented
