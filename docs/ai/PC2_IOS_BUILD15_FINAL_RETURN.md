# PC2 FINAL RETURN — iOS BUILD 15 WATCH LOAD FAIL

Official close of device QA on TestFlight **1.0.0 (15)**. Evidence
only. Do **not** invent PASS. Do **not** patch. Do **not** rebuild.
Do **not** submit App Store Production. Do **not** ask the operator
to Retry, swipe failed cards, retest seek, or start P3.

## Provenance

```text
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 15
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
EAS_SUBMIT_ID = 1bb47fd0-6507-44f5-ac52-3103f18706b7
SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUNDLE_ID = com.umtuba.app
DEVICE = physical iPhone 13
DATE = 2026-08-18
TASK_ID = PC2_IOS_BUILD15_WATCH_LOAD_AUDIO_FINAL_GATE_V1
EXPO_MEDIA_LIBRARY = 57.0.3
CURSOR_REPORT_OVERWRITTEN = NO
```

Evidence already on disk:

- `docs/ai/PC2_IOS_BUILD15_REPORT.md` (Phase 1 build/submit)
- `docs/ai/PC2_IOS_BUILD15_QA_PREP.md` (P0 prep)
- `docs/ai/PC2_IOS_BUILD15_QA_REPORT.md` (device QA, now FAIL)
- `docs/ai/PC2_IOS_BUILD15_RESOURCE_UNAVAILABLE_REPORT.md` (this
  investigation)

This file is the official final return, not a new investigation.

---

## Official lock (authoritative)

```text
PC2 FINAL RETURN — IOS BUILD 15 WATCH LOAD FAIL
DEVICE = physical iPhone 13
TESTFLIGHT_BUILD = 15
SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
FIRST_ACTIVE_CARD = PASS
A_TO_B = PASS
B_TO_C = PASS
BACK_SWIPE_LOAD = PASS
WATCH_PLAYER_ITEM_LOAD = FAIL_INTERMITTENT
RESOURCE_UNAVAILABLE_REPRODUCED = YES
VISIBLE_ERROR = Failed to load the player item: resource unavailable
RETRY_RECOVERY = UNRELIABLE
MULTIPLE_VIDEO_PLAYBACK_STABILITY = FAIL_INTERMITTENT
SLOW_SWIPE_AUDIO = PASS
FAST_SWIPE_AUDIO = PASS
BACK_SWIPE_AUDIO = PASS
DUAL_AUDIO = NOT_OBSERVED
OLD_AUDIO_RESTART = NO
PARTIAL_SWIPE_AUDIO = NOT_COMPLETED_DUE_TO_LOAD_FAILURE
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = PASS_FOR_COMPLETED_SLOW_FAST_BACKWARD_TRANSITIONS
P2 = INCOMPLETE
P3_SMOKE = NOT_STARTED
WATCH_SEEK_SCRUBBER = OBSERVATION_ONLY_DO_NOT_RETEST
PLAYBACK_UNAFFECTED = FAIL
DEVICE_QA_RESULT = FAIL
BUILD15_RELEASE_STATUS = FAIL_INTERMITTENT_LOAD
RESOURCE_UNAVAILABLE_ROOT_CAUSE = MOST_LIKELY_IOS_AVPLAYERITEM_LOAD_AFTER_REPEATED_RELEASE_RECREATE — UNCONFIRMED
RETRY_ROOT_CAUSE = HIT_TEST_COVERS_RETRY_PLUS_IN_PLACE_REPLACE_NOT_REMOUNT
RELATED_TO_PLAYER_LIFECYCLE_FIX = PARTIAL
SHARED_OR_IOS_SPECIFIC = SHARED_JS_PATH; VISIBLE_ERROR_STRING_IOS_AVPLAYER
ANDROID_IMPACT = SAME_JS_UNCONFIRMED_ON_DEVICE
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
NEW_IOS_BUILD_REQUIRED = YES
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
CENTRAL_ACTION_REQUIRED =
1. Produce ONE new authoritative shared mobile SHA.
2. Fix player/source lifetime across repeated ±1 release/recreate and Retry (reload media; hittable Retry; do not toggle pause/play on a failed/stale player).
3. Authorize the next unused iOS build number. Do not reuse Build 15 / SHA abf8af9e.
4. Do not Submit Production on Build 15.
5. PC2 stays idle. No operator Retry / failed-card swipe / seek retest / P3.
DO_NOT =
- patch or rebuild from this turn
- ship Build 15
- ask the operator to Retry or continue Watch QA on 15
- retest seek
- start P3
- reset diverged local 77e9e28
- invent PASS
```

---

## Judgment

Early load and completed swipe-audio transitions PASS. After
further successful video transitions the player item failed
intermittent with the expo-video iOS string
`Failed to load the player item: resource unavailable`. Retry
does not cleanly reload. Playback is affected. P2 final audio
gate is incomplete. P3 was not started.

Source investigation cannot prove a single root cause. Most
likely candidate is iOS `AVPlayerItem` load failure after
repeated `shouldLoadPlayer` ±1 release/recreate, amplified by
Build 15 detach-without-pause on unmount. Retry hit-testing
(play/pause layer above Retry) plus in-place `replaceAsync` /
`play()` matches the operator toggle. A new SHA is still
required.

Build 15 is **FAIL_INTERMITTENT_LOAD**. Not Production.

---

## Safety

- No product patch / rebuild / EAS / Production submit.
- No operator action asked.
- `CURSOR_REPORT.md` not overwritten.
- No secrets in this report.
