# PC2 iOS BUILD 11 — launch surgical QA (CLOSED)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD11_LAUNCH_SURGICAL_QA_V1
DATE = 2026-08-17
PHASE = CLOSED
MODE = SURGICAL_QA_CLOSED
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 11
AUTHORIZED_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
BUILD_SOURCE_SHA = 4b9fa5667e1db59c1854d61d23fdf12862a81a31
IOS_BUILD_NUMBER = 11
EAS_BUILD_ID = 96aca0f9-47f9-4c32-b443-c2301a97ecba
EAS_SUBMIT_ID = 3bb775e9-7614-45e2-aaf3-b95a5182a067
BUILD_RESULT = FINISHED
TESTFLIGHT_AVAILABLE = YES_INTERNAL
BUILD11_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = 11
BUILD11_IPHONE_INSTALL = PASS
BUILD11_UPDATE_COMPLETE = YES
BUILD11_INSTALLED = YES
BUILD11_COLD_LAUNCH = PASS
DYLD_CRASH = NOT_REPRODUCED_AFTER_COMPLETE_INSTALL
P1_LAUNCH_GATE = PASS
SHARE_SURGICAL_QA = PASS
CREATE_BASIC_FLOW = PASS
CREATE_AFTER_PUBLISH = PASS
CREATE_AFTER_PUBLISH_RESET = PASS
STALE_ASSET_AFTER_PUBLISH = NO
STALE_ASSET = PASS_AFTER_PUBLISH
REPLACE_VIDEO = NOT_TESTED
CANCEL_PICKER = NOT_TESTED
P2_SURGICAL_QA = CLOSED
EARLIER_PENDING_UPDATE_LAUNCH = IGNORED_NOT_FINAL
BUILD10_RETESTED_AS_BUILD11 = NO
DEVICE_QA_EXECUTED = YES
DEVICE_QA_RESULT = PASS
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
SHARED_DEFECT_PATCHED_HERE = NO
EXPO_MEDIA_LIBRARY = 57.0.3
BLOCKERS =
CENTRAL_ACTION_REQUIRED = FINAL_RELEASE_DECISION
```

Surgical QA is **CLOSED**. Official return:
`docs/ai/PC2_IOS_BUILD11_FINAL_RETURN.md`.

`REPLACE_VIDEO` and `CANCEL_PICKER` remain **NOT_TESTED**. They were
never completed as dedicated gates after the operator stop. They are
**not** marked PASS. They are **not** treated as release blockers for
this close (see Judgment below).

---

## Official status (closed)

```text
DEVICE = physical iPhone 13
TESTFLIGHT_BUILD = 11
BUILD11_AVAILABLE = YES_INTERNAL
BUILD11_INSTALLED = YES
BUILD11_UPDATE_COMPLETE = YES
BUILD11_COLD_LAUNCH = PASS
DYLD_CRASH = NOT_REPRODUCED_AFTER_COMPLETE_INSTALL
P1_LAUNCH_GATE = PASS
SHARE_SURGICAL_QA = PASS
VIDEO_LIBRARY = PASS
SELECT_VIDEO = PASS
CREATE_PUBLISH = PASS
PUBLISHED_VIDEO_VISIBLE = PASS
PUBLISHED_VIDEO_VISIBLE_IN_WATCH = PASS
PLAYBACK = PASS
CREATE_BASIC_FLOW = PASS
CREATE_AFTER_PUBLISH = PASS
CREATE_AFTER_PUBLISH_RESET = PASS
CREATE_RESET = PASS
STALE_ASSET_POST_PUBLISH_REENTRY = NO
STALE_ASSET_AFTER_PUBLISH = NO
STALE_ASSET = PASS_AFTER_PUBLISH
REPLACE_VIDEO = NOT_TESTED
CANCEL_PICKER = NOT_TESTED
SELECT_A = NOT_COMPLETED_AS_DEDICATED_REMAINING_GATE
DEVICE_QA_RESULT = PASS
APP_STORE_PRODUCTION_SUBMITTED = NO
```

---

## P1 launch gate (closed)

Official P1 correction is **authoritative**. An earlier launch
attempt occurred while TestFlight still showed an update pending.
That attempt is **ignored** as the final launch result. After the
Build 11 update completed, UMTUBA opened on the physical iPhone 13.

| Field | Result |
| --- | --- |
| BUILD11_IPHONE_INSTALL | PASS |
| BUILD11_UPDATE_COMPLETE | YES |
| BUILD11_COLD_LAUNCH | PASS |
| DYLD_CRASH | NOT_REPRODUCED_AFTER_COMPLETE_INSTALL |
| P1_LAUNCH_GATE | PASS |

---

## P2 Share (closed)

Operator evidence is **authoritative**. Do **not** repeat Share.

```text
SHARE_CONTROL = PASS
SHARE_TWO_CHOICES = PASS
SHARE_LINK = PASS
SHARE_LINK_RECIPIENT = PASS
SHARE_EXACT_POST = PASS
SHARE_VIDEO_FILE = PASS
SHARE_VIDEO_RECIPIENT = PASS
SHARED_VIDEO_PLAYABLE = PASS
SHARED_VIDEO_EXACT_CURRENT_VIDEO = PASS
STALE_SHARE_IDENTITY = NO
STALE_POST_IDENTITY = NO
STALE_VIDEO_IDENTITY = NO
SHARE_SURGICAL_QA = PASS
SHARE_RETEST = FORBIDDEN
```

---

## P2 Create basic flow (closed)

```text
VIDEO_LIBRARY = PASS
SELECT_VIDEO = PASS
CREATE_PUBLISH = PASS
PUBLISHED_VIDEO_VISIBLE = PASS
PUBLISHED_VIDEO_VISIBLE_IN_WATCH = PASS
PLAYBACK = PASS
CREATE_BASIC_FLOW = PASS
```

---

## P2 Create after publish (closed)

Official. Do **not** repeat this reset test.

```text
CREATE_AFTER_PUBLISH = PASS
CREATE_AFTER_PUBLISH_RESET = PASS
CREATE_RESET = PASS
STALE_ASSET_POST_PUBLISH_REENTRY = NO
STALE_ASSET_AFTER_PUBLISH = NO
STALE_ASSET = PASS_AFTER_PUBLISH
RESET_RETEST = FORBIDDEN
```

This covers the Build 8 stale-Create-after-publish class. It is
**not** a dedicated replace/cancel identity-picker result.

---

## Explicitly NOT_TESTED (called out — not PASS)

Never completed as dedicated steps after the operator stop
directive. Do **not** invent PASS.

```text
REPLACE_VIDEO = NOT_TESTED
CANCEL_PICKER = NOT_TESTED
```

Meaning:

- `REPLACE_VIDEO` — select A then a different B so B fully replaces A
  was never run as a dedicated gate.
- `CANCEL_PICKER` — open picker with B selected, cancel, confirm B
  remains was never run as a dedicated gate.

These stay **NOT_TESTED** in the official return.

---

## Judgment (why CLOSED / DEVICE_QA_RESULT = PASS)

Central GO P3 listed replace / cancel / stale as authorized Create
gates. Release-critical vs confirmatory:

1. **Launch (P0/P1).** Build 10 was REJECTED for dyld
   ExpoMediaLibrary mismatch. That class is PASS on Build 11 after
   complete TestFlight update.
2. **Stale Create after publish.** Build 8’s Create-class defect is
   covered by `CREATE_AFTER_PUBLISH_RESET = PASS` and
   `STALE_ASSET_AFTER_PUBLISH = NO`.
3. **Replace / cancel.** Identity-picker confirmations. Operator
   states remaining Create behavior is working correctly and forbids
   more one-action loops unless a genuinely unverified
   **release-critical** gate remains.

Decision: replace and cancel are **not** release-critical for this
close. Surgical QA is CLOSED. `DEVICE_QA_RESULT = PASS`. Those two
fields remain **NOT_TESTED**. No Production submit by PC2.

```text
BLOCKERS =
CENTRAL_ACTION_REQUIRED = FINAL_RELEASE_DECISION
```

---

## Out of scope (unchanged)

```text
CREATE_FULL_LIBRARY = NOT_TESTED
LONG_VIDEO_PUBLISH_GATE = NOT_APPLICABLE_NO_MAX_IN_SOURCE
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = NOT_IN_SCOPE
OWN_PROFILE = NOT_IN_SCOPE
COMMENT = NOT_IN_SCOPE
LANGUAGE_SELECTOR = NOT_IN_SCOPE
LOCALE_OVERRIDE_PERSISTENCE = NOT_IN_SCOPE
RTL_BACK = NOT_IN_SCOPE
```

---

## Safety / scope

- No local product patch.
- No rebuild / re-upload / Production submit.
- No Share retest.
- No reset retest.
- No one-action Create restart for replace/cancel.
- No historical QA broadening (Like / Profile / Comment / RTL /
  localization / volume) unless a later GO.
- `CURSOR_REPORT.md` not overwritten.
- Replace / cancel not invented as PASS.
