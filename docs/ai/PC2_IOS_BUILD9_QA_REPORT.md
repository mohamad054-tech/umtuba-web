# PC2 iOS BUILD 9 — surgical device QA

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD9_SURGICAL_QA_V1
DATE = 2026-08-17
PHASE = SHARE_IN_PROGRESS / WATCH_HOP
MODE = SURGICAL_QA / ONE_ACTION
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 9
AUTHORIZED_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
BUILD_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
IOS_BUILD_NUMBER = 9
EAS_BUILD_ID = 72a73a7e-8c7c-45de-8f4e-7d159f7054e2
BUILD_RESULT = FINISHED
TESTFLIGHT_AVAILABLE = YES_INTERNAL
BUILD9_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = 9
IPHONE13_INSTALL = OPERATOR_CONFIRMED
BUILD9_INSTALLED = YES
BUILD8_RETESTED_AS_BUILD9 = NO
DEVICE_QA_EXECUTED = IN_PROGRESS
DEVICE_QA_RESULT = IN_PROGRESS
CREATE_INITIAL_STATE = CLEAN
VIDEO_PICKER_OPEN = PASS
PERMISSION_ERROR = NONE
NEW_ASSET_SELECTED = YES
CREATE_RETURNED = PASS
SELECTED_ASSET = IMG_0008.MOV
SELECTED_DURATION = 8s
SELECTED_SIZE = 9.5_MB
SELECTED_TYPE = video/quicktime
PUBLISH_VISIBLE = YES
PUBLISH_ENABLED = YES
TERMS_CONFIRMATION = PASS
TERMS_UNCHECKED = NO
PUBLISH_RESULT = PASS
SUCCESS_MESSAGE = تم نشر الفيديو.
POST_PUBLISH_CREATE_LOOKS_CLEARED = YES
OPEN_WATCH = PRESENT
PUBLISHED_VIDEO_VISIBLE = YES
CREATE_RESET = PASS
CREATE_RESET_VERIFIED = YES
FRESH_CREATE_REENTRY = PASS
BUILD8_CREATE_STALE_ASSET_DEFECT = FIX_VERIFIED_ON_BUILD9
CREATE_CANCEL = PASS
CREATE_CANCEL_TESTED = YES
CREATE_CANCEL_PRESERVES_VALID_CURRENT_ASSET = PASS
CANCEL_ASSET_BEFORE = IMG_0008.MOV
CANCEL_ASSET_AFTER = IMG_0008.MOV
CANCEL_DURATION = 8s
CANCEL_SIZE = 9.5_MB
CREATE_REPLACE = PASS
CREATE_REPLACE_TESTED = YES
REPLACE_ASSET_A = IMG_0008.MOV
REPLACE_ASSET_A_DURATION = 8s
REPLACE_ASSET_B = 72s_12.0_MB_video/mp4
OLD_ASSET_REMAINED = NO
72S_PUBLISH_RESULT = ALLOWED_AND_SUCCESSFUL
AUTHORITATIVE_MAX_VIDEO_DURATION = NONE_NO_HARD_MAX
AUTHORITATIVE_MAX_VIDEO_BYTES = 50_MB
IS_72S_OVER_DURATION = NO
CLASSIFICATION_OF_72S_PUBLISH = VALID_IN_CONTRACT_NOT_OVER_DURATION_TEST
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
LIKE_STATE = FAIL
LIKE_VISUAL_STATE = FAIL
LIKE_ACTION = WORKING
LIKE_COUNT_UPDATE = WORKING
DEFECT = LIKE_VISUAL_STATE_NOT_UPDATING_AFTER_UNLIKE
IOS_REPRODUCED = YES
LIKELY_CLASS = STALE_LOCAL_UI_STATE / VIEWER_LIKE_STATE_SYNC
SHARED_DEFECT_PATCHED_HERE = NO
OWN_PROFILE = PASS
SETTINGS_ONLY_PROFILE = NO
BUILD8_OWN_PROFILE_DEFECT = FIX_VERIFIED_ON_BUILD9
OWN_PROFILE_IDENTITY = @mohamad
OWN_PROFILE_VIDEOS = 18
OWN_PROFILE_FOLLOWING = 1
OWN_PROFILE_FOLLOWERS = 1
SHARE = NOT_TESTED
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
SHARED_DEFECT_PATCHED_HERE = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

Operator confirmed **UMTUBA 1.0.0 (9)** on the physical iPhone 13
from SHA `7b33bae707a0eecb4107f4373698630eaea7a1c5`. Do **not**
test Build 8. Do **not** invent PASS. Do **not** Submit for Review
/ Production. Do **not** independently patch.

`CREATE_RESET` is **PASS**. Authorized gate closed: successful
publish on Build 9 → Watch → fresh Create with no leftover
asset / filename / duration / caption / terms / success. Build 8
stale-asset defect is **FIX_VERIFIED_ON_BUILD9**. Do **not**
repeat `CREATE_RESET`. `CREATE_CANCEL` is **PASS**.
`CREATE_REPLACE` is **PASS**. `LIKE_STATE` is **FAIL** (heart
stays red after Unlike; count decreases). No local fix. Next
`OWN_PROFILE` is **PASS**. Next gate is `SHARE` only.
`LONG_VIDEO_PUBLISH_GATE` stays **NOT_TESTED** — source has no
hard max duration.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD9_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = 9
BUILD9_INSTALLED = YES
CREATE_INITIAL_STATE = CLEAN
PREVIOUS_ASSET_PRESENT = NO
PREVIOUS_FILENAME = NONE
CAPTION = EMPTY
TERMS_CONFIRMATION = PASS
PUBLISH_RESULT = PASS
SUCCESS_MESSAGE = تم نشر الفيديو.
POST_PUBLISH_SELECTED_ASSET = CLEARED
POST_PUBLISH_CAPTION = EMPTY
POST_PUBLISH_TERMS = UNCHECKED
POST_PUBLISH_CREATE_SHOWS = لم يُختر فيديو بعد
OPEN_WATCH = PRESENT
PUBLISHED_VIDEO_VISIBLE = YES
CREATE_RESET = PASS
CREATE_RESET_VERIFIED = YES
FRESH_CREATE_REENTRY = PASS
BUILD8_CREATE_STALE_ASSET_DEFECT = FIX_VERIFIED_ON_BUILD9
CREATE_CANCEL = PASS
CREATE_CANCEL_TESTED = YES
CREATE_CANCEL_PRESERVES_VALID_CURRENT_ASSET = PASS
CANCEL_ASSET_BEFORE = IMG_0008.MOV
CANCEL_ASSET_AFTER = IMG_0008.MOV
CANCEL_DURATION = 8s
CANCEL_SIZE = 9.5_MB
CREATE_REPLACE = PASS
CREATE_REPLACE_TESTED = YES
REPLACE_ASSET_A = IMG_0008.MOV
REPLACE_ASSET_A_DURATION = 8s
REPLACE_ASSET_B = 72s_12.0_MB_video/mp4
OLD_ASSET_REMAINED = NO
72S_PUBLISH_RESULT = ALLOWED_AND_SUCCESSFUL
AUTHORITATIVE_MAX_VIDEO_DURATION = NONE_NO_HARD_MAX
AUTHORITATIVE_MAX_VIDEO_BYTES = 50_MB
IS_72S_OVER_DURATION = NO
CLASSIFICATION_OF_72S_PUBLISH = VALID_IN_CONTRACT_NOT_OVER_DURATION_TEST
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = FAIL
LIKE_VISUAL_STATE = FAIL
LIKE_ACTION = WORKING
LIKE_COUNT_UPDATE = WORKING
OWN_PROFILE = PASS
SETTINGS_ONLY_PROFILE = NO
BUILD8_OWN_PROFILE_DEFECT = FIX_VERIFIED_ON_BUILD9
SHARE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
RTL_BACK = NOT_TESTED
SIDE_VOLUME = NOT_TESTED
OLD_TOP_VOLUME_BAR = NOT_TESTED
MUTE_UNMUTE = NOT_TESTED
VOLUME_ADJUSTMENT = NOT_TESTED
WATCH_COLLISION = NOT_TESTED
WATCH_RTL = NOT_TESTED
WATCH_LTR = NOT_TESTED
PLAYBACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
DEVICE_QA_RESULT = IN_PROGRESS
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = LIKE_VISUAL_STATE_FAIL
SHARE = NOT_TESTED
```

Do **not** repeat Create gates or Own Profile. Do **not**
re-toggle Like. Do **not** invent PASS. Do **not** patch the Like
visual defect. Do **not** tap Share this turn.

---

## Recorded evidence (install + first Create look)

Operator, physical iPhone 13 + **1.0.0 (9)**:

```text
TESTFLIGHT_BUILD = 9
CREATE_OPENED_ON_BUILD9 = YES
CREATE_INITIAL_STATE = CLEAN
PREVIOUS_ASSET_PRESENT = NO
PREVIOUS_FILENAME = NONE
CAPTION = EMPTY
TERMS = UNCHECKED
SUCCESS_STATE = NONE
BUILD8_LEFTOVER_IMG_0008_MOV = ABSENT_AFTER_BUILD9_INSTALL
VIDEO_PICKER_OPEN = PASS
PERMISSION_ERROR = NONE
NEW_ASSET_SELECTED = YES
CREATE_RETURNED = PASS
SELECTED_ASSET = IMG_0008.MOV
SELECTED_DURATION = 8s
SELECTED_SIZE = 9.5_MB
SELECTED_TYPE = video/quicktime
PUBLISH_VISIBLE = YES
TERMS_UNCHECKED = NO
TERMS_CONFIRMATION = PASS
PUBLISH_ENABLED = YES
PUBLISH_RESULT = PASS
SUCCESS_MESSAGE = تم نشر الفيديو.
POST_PUBLISH_SELECTED_ASSET = CLEARED
POST_PUBLISH_CAPTION = EMPTY
POST_PUBLISH_TERMS = UNCHECKED
POST_PUBLISH_CREATE_SHOWS = لم يُختر فيديو بعد
OPEN_WATCH = PRESENT
WATCH_OPENED_AFTER_PUBLISH = YES
PUBLISHED_VIDEO_VISIBLE = YES
FRESH_CREATE_REENTRY = PASS
FRESH_CREATE_AFTER_WATCH = CLEAN
FRESH_CREATE_ASSET = NONE
FRESH_CREATE_FILENAME = NONE
FRESH_CREATE_DURATION = NONE
FRESH_CREATE_CAPTION = EMPTY
FRESH_CREATE_TERMS = UNCHECKED
FRESH_CREATE_SUCCESS = NONE
CREATE_RESET = PASS
BUILD8_CREATE_STALE_ASSET_DEFECT = FIX_VERIFIED_ON_BUILD9
```

Publish **PASS** on Build 9. Immediate Create after success looked
cleared. Operator then opened Watch (published video visible) and
re-entered Create: no asset / filename / duration / caption /
checked terms / success message. `CREATE_RESET = PASS`. Build 8
stale-asset defect is **FIX_VERIFIED_ON_BUILD9**. Do **not**
repeat this gate.

---

## Operator action (this turn — SHARE Watch hop)

Operator is on **Profile**. `OWN_PROFILE` is **PASS**. Do **not**
repeat Profile. Next gate is Share. This hop: open Watch only.
Do **not** tap Share.

```text
OPERATOR_DEVICE = iPhone 13
OPERATOR_ACTION = من الأسفل اضغط «شاهد» مرة واحدة. توقف. اكتب: هل فُتح شاهد؟ هل ترى زر مشاركة؟
WHY_REQUIRED = نصل إلى منشور فيه مشاركة. لا نضغط مشاركة هذا الدور.
```

Stop after Watch is on screen. Record: Watch opened yes/no; Share
control visible yes/no. Do **not** tap مشاركة.

---

## CREATE_RESET gate (closed)

```text
CREATE_RESET = PASS
BUILD8_CREATE_STALE_ASSET_DEFECT = FIX_VERIFIED_ON_BUILD9
```

1. Pick a valid short video — done (`IMG_0008.MOV`, 8s).
2. Accept UGC terms — done.
3. Successful publish — done (`تم نشر الفيديو.`).
4. Immediate post-publish Create looked cleared — recorded.
5. Fresh Create after Watch — clean. Gate closed.

---

## CREATE_CANCEL gate (closed)

```text
CREATE_CANCEL = PASS
CREATE_CANCEL_PRESERVES_VALID_CURRENT_ASSET = PASS
CANCEL_ASSET_BEFORE = IMG_0008.MOV
CANCEL_ASSET_AFTER = IMG_0008.MOV
CANCEL_DURATION = 8s
CANCEL_SIZE = 9.5_MB
```

Valid current asset stayed unchanged after picker cancel. Gate
closed. Do **not** repeat.

---

## CREATE_REPLACE gate (closed)

```text
CREATE_REPLACE = PASS
REPLACE_ASSET_A = IMG_0008.MOV
REPLACE_ASSET_A_DURATION = 8s
REPLACE_ASSET_B = 72s_12.0_MB_video/mp4
OLD_ASSET_REMAINED = NO
```

B replaced A. `IMG_0008.MOV` did not remain. Gate closed. Do
**not** repeat.

The 72s B asset was then published successfully (`تم نشر الفيديو.`).
Create cleared. Watch showed 1:12. Playback observed at 0:03 and
0:24. That publish is **in-contract**, not an over-duration test.

---

## Duration contract (Build 9 source `7b33bae`)

Read from worktree
`umtuba-mobile-pc2-ios-build9-surgical-qa-v1` HEAD
`7b33bae707a0eecb4107f4373698630eaea7a1c5` —
`src/contracts/video.ts` `validateVideoDuration`:

- Duration optional (null OK).
- Reject only non-finite or `<= 0`.
- Comment in source: **No hard max — matches web.**
- Size cap only: `MAX_VIDEO_BYTES = 50 MB`.
- No 60 / 90 / 120 / 180 second ceiling in create.tsx, pickVideo,
  or createUploadState.

```text
AUTHORITATIVE_MAX_VIDEO_DURATION = NONE_NO_HARD_MAX
AUTHORITATIVE_MAX_VIDEO_BYTES = 50_MB
IS_72S_OVER_DURATION = NO
CLASSIFICATION_OF_72S_PUBLISH = VALID_IN_CONTRACT_NOT_OVER_DURATION_TEST
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
```

72s / 12.0 MB is within the allowed contract. It is **not** the
over-duration test. Do **not** invent a 60s / 90s / 2-minute max.
Do **not** ask for another publish to manufacture an over-duration
case. `LONG_VIDEO_PUBLISH_GATE` stays `NOT_TESTED` (no ceiling to
violate). `DIRECT_PUBLISH_BOUNDARY` stays `NOT_TESTED` (72s was a
valid Publish, not a bypass of an invalid-duration gate).

---

## LIKE_STATE gate (closed FAIL)

Operator correction on the **same** video, physical iPhone 13 +
Build 9. No local fix. Shared-mobile candidate. Central verifies
Android parity / source ownership.

```text
DEFECT = LIKE_VISUAL_STATE_NOT_UPDATING_AFTER_UNLIKE
LIKE_STATE = FAIL
LIKE_VISUAL_STATE = FAIL
LIKE_ACTION = WORKING
LIKE_COUNT_UPDATE = WORKING
IOS_REPRODUCED = YES
LIKELY_CLASS = STALE_LOCAL_UI_STATE / VIEWER_LIKE_STATE_SYNC
SHARED_DEFECT_PATCHED_HERE = NO
```

Expected: count down + heart immediately inactive / unfilled.
Actual: Unlike appears to succeed (count decreases). Heart stays
red / stale. Do **not** re-toggle Like. Do **not** patch.

---

## OWN_PROFILE gate (closed)

```text
OWN_PROFILE = PASS
SETTINGS_ONLY_PROFILE = NO
BUILD8_OWN_PROFILE_DEFECT = FIX_VERIFIED_ON_BUILD9
OWN_PROFILE_IDENTITY = @mohamad
OWN_PROFILE_VIDEOS = 18
OWN_PROFILE_FOLLOWING = 1
OWN_PROFILE_FOLLOWERS = 1
OWN_PROFILE_VIDEOS_SECTION = PRESENT
OWN_PROFILE_GRID = PRESENT
```

Useful profile / content experience, not a Settings-only shell.
Gate closed. Do **not** repeat.

---

## Remaining authorized checks (not this turn)

CREATE: long-video gate stays `NOT_TESTED` (no hard max in
source). Direct publish boundary / retry / late-callback only if
a safe error later appears. Do **not** repeat `CREATE_RESET`,
`CREATE_CANCEL`, or `CREATE_REPLACE`. Do **not** publish another
video this turn.

This turn: Watch hop for `SHARE` only. Do **not** tap Share.

MOBILE remaining: share once (this gate), comment once, language
selector + one override, override persist after restart, **one**
Arabic RTL secondary Back.

WATCH: compact side volume (no old top bar), mute/unmute/adjust,
no collision, AR RTL + EN LTR spot-check, representative playback
only.

Out of scope unless new regression: closed Build 8 overlap /
progress / `8200s` duration, full localization, full RTL Back
gate, Saved, Follow, Messages, Session, Background/Resume,
playback intermittent matrix.

Do not create disposable accounts. Do not block real users. Do
not delete the account. Anything not safely reproducible stays
`NOT_TESTED` / `NOT_REPRODUCIBLE`, not PASS.

---

## What was not done (by design)

- `OWN_PROFILE` closed PASS; not repeated
- `LIKE_STATE` / `LIKE_VISUAL_STATE` remains FAIL; not patched
- Share not tapped this turn
- No App Store Production submit
- No shared-defect patch
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten

---

## Return fields (this turn)

```text
OPERATOR_DEVICE = iPhone 13
OPERATOR_ACTION = من الأسفل اضغط «شاهد» مرة واحدة. توقف. اكتب: هل فُتح شاهد؟ هل ترى زر مشاركة؟
WHY_REQUIRED = نصل إلى منشور فيه مشاركة. لا نضغط مشاركة هذا الدور.
BUILD9_INSTALLED = YES
TESTFLIGHT_BUILD = 9
OWN_PROFILE = PASS
BUILD8_OWN_PROFILE_DEFECT = FIX_VERIFIED_ON_BUILD9
LIKE_STATE = FAIL
LIKE_VISUAL_STATE = FAIL
SHARE = NOT_TESTED
APP_STORE_PRODUCTION_SUBMITTED = NO
```
