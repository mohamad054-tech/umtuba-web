# PC2 iOS BUILD 14 — Cold launch / Watch audio QA (P1 PASS; slow swipe pending classification)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD14_COLD_LAUNCH_WATCH_AUDIO_QA_V1
DATE = 2026-08-17
PHASE = P1 PASS — SLOW_SWIPE_AUDIO PENDING_CLASSIFICATION
MODE = RECORD_ONLY — NO PATCH — NO REBUILD — NO BROADEN QA
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 14
AUTHORIZED_SOURCE_SHA = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
SOURCE_SHA = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
BUILD_SOURCE_SHA = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
IOS_BUILD_NUMBER = 14
EAS_BUILD_ID = 3e6244da-1d84-4aec-93e4-29805258452d
EAS_SUBMIT_ID = 06fb43e7-a620-4bb9-be2f-b211af5ba93a
BUILD_RESULT = FINISHED
TESTFLIGHT_AVAILABLE = YES_INTERNAL
BUILD14_TESTFLIGHT_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = 14
BUILD14_INSTALLED = YES
DEVICE_QA_EXECUTED = YES
P1 = PASS
COLD_LAUNCH = PASS
WATCH_INITIALIZATION = PASS
EXPO_SHARED_OBJECT_ERROR = NOT_REPRODUCED
SHAREDOBJECT_CRASH = NOT_REPRODUCED
WATCH = PASS
WATCH_PLAYBACK = OBSERVED
WATCH_AUDIO_OWNERSHIP = PENDING_CLASSIFICATION
PREVIOUS_VIDEO_AUDIO_STOPS_ON_NEXT_VIDEO = OBSERVED_ON_COMPLETE_SWIPE
OLD_AUDIO_AFTER_B_BECAME_ACTIVE = NO
AUDIO_DURING_TRANSITION = YES
AUDIO_OVERLAP = NOT_BUILD12
SLOW_SWIPE_AUDIO = PENDING_CLASSIFICATION
CLASSIFICATION = EXPECTED_ACTIVE_POST_TRANSITION
ACTIVE_POST_SWITCH_THRESHOLD = onViewableItemsChanged + itemVisiblePercentThreshold 80 + minimumViewTime 80ms (NOT snap/index complete)
A_AUDIO_DURING_PARTIAL_SWIPE_INTENDED = YES
SIMULTANEOUS_A_PLUS_B_POSSIBLE_IN_SOURCE = NO
FAST_SWIPE_AUDIO = NOT_TESTED
A_TO_B_TO_C = NOT_TESTED
BACK_SWIPE_AUDIO = NOT_TESTED
PARTIAL_SWIPE = NOT_TESTED
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = NOT_TESTED
PRELOADED_PLAYERS_SILENT = NOT_TESTED
SESSION_PERSIST_COLD = NOT_TESTED
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
DEVICE_QA_RESULT = P1_PASS_SLOW_SWIPE_PENDING_CLASSIFICATION
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
SLOW_SWIPE_MARKED_PASS = NO
BUILD13_RETESTED_AS_BUILD14 = NO
BUILD12_SESSION_RETESTED = NO
SHARED_DEFECT_PATCHED_HERE = NO
EXPO_MEDIA_LIBRARY = 57.0.3
SECRET_VALUES_PRINTED = NO
PLAINTEXT_PASSWORD = NO
BLOCKERS = SLOW_SWIPE_AUDIO_PENDING_CLASSIFICATION; HOLD_AT_MID_SWIPE_NOT_OBSERVED; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
CENTRAL_ACTION_REQUIRED = ONE_HOLD_AT_MID_SWIPE_OBSERVATION
```

Inspected detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build14-cold-launch-watch-audio-qa-v1`
at SHA `0ddd423f91fe238f5d211ed19a727f3180a9b48d` only. Main checkout
`umtuba-mobile` at `77e9e28` was **not** reset.

Do **not** patch. Do **not** rebuild. Do **not** Submit for Review /
Production. Do **not** broaden QA (no Share / Create / fast swipe).
Do **not** mark `SLOW_SWIPE_AUDIO = PASS`.

---

## Official P1 result (authoritative — do not retest, do not downgrade)

Operator evidence on physical iPhone 13 / TestFlight **1.0.0 (14)**.

```text
COLD_LAUNCH = PASS
WATCH_INITIALIZATION = PASS
SHAREDOBJECT_CRASH = NOT_REPRODUCED
P1 = PASS
```

Build 13 SharedObject use-after-release did **not** reproduce.

---

## Official slow-swipe evidence (not Build 12)

Completed slow swipe A → B. This is **not** Build 12 (old audio over
new active video). Central said confirm A stops immediately — do
**not** mark `SLOW_SWIPE_AUDIO = PASS`.

```text
AUDIO_FROM_A_WHILE_A_SLIDING_UP = YES
A_AUDIO_STOPPED_WHEN_B_BECAME_ACTIVE = YES
OLD_AUDIO_AFTER_B_BECAME_ACTIVE = NO
AUDIO_DURING_TRANSITION = YES
B_LOADING_BUFFERING_DURING_TRANSITION = YES
SLOW_SWIPE_AUDIO = PENDING_CLASSIFICATION
```

B showed noticeable loading/buffering during the transition. That is
visual preload, not old-audio-after-B-active.

---

## Source classification (SHA 0ddd423f — read-only)

There is no `activePostId` state. The active Watch post is
`videos[activeIndex]`. `isActive={index === activeIndex}`. Adjacent
expo-video players stay mounted (`shouldLoadPlayer` when
`Math.abs(index - activeIndex) <= 1`).

### 1. Is A still intentionally active during a partial swipe?

**YES.** `claimActiveIndex` runs only from `onViewableItemsChanged`
when a token is `isViewable` and has an index. Mid-swipe, with A and
B both ~50% on screen, neither meets the 80% viewability threshold,
so `viewableItems` does not claim B and `activeIndex` stays on A.
Snap (`pagingEnabled` / `snapToInterval`) does **not** flip the
active post by itself.

### 2. Exact switch threshold to B

```text
ACTIVE_POST_SWITCH_THRESHOLD = onViewableItemsChanged
  itemVisiblePercentThreshold = 80
  minimumViewTime = 80ms
  first viewable item index → claimActiveIndex
  NOT snap-complete
  NOT index-settle
```

`activeIndex` (and `playbackGeneration`) switch when B has been ≥80%
visible for ≥80ms. That is late in a full-height paging swipe, not at
the midpoint.

### 3. Does mute/pause of A run on that same threshold?

**YES.** The same `isActive` flip drives audio teardown:

- `resolveWatchPlaybackIntent({ isActive: false })` → pause, mute,
  volume 0, loop false, resetPosition true
- `resolveEffectiveAudio({ isActive: false })` → muted true, volume 0
- `canProduceWatchAudio` requires `isActive`

Mute/pause of A is not a separate snap hook. It runs when
`activeIndex` leaves A.

### 4. Can A+B both produce audio during the slide?

**NO in source.** Adjacent B is preloaded and mounted, but only
`index === activeIndex` may unmute. Inactive cards are forced silent.
`isWatchAudioOwner` / `countAudibleWatchPlayers` allow at most one
audible owner. Source does not unmute the adjacent preload.

---

## Classification (source + this evidence)

```text
CLASSIFICATION = EXPECTED_ACTIVE_POST_TRANSITION
SLOW_SWIPE_AUDIO = PENDING_CLASSIFICATION
```

A remains the intended audio owner until B hits 80% viewability for
80ms. Operator heard A while A was still sliding, then A stopped when
B fully replaced A as the active post, and
`OLD_AUDIO_AFTER_B_BECAME_ACTIVE = NO`. That matches intended
ownership, not Build 12 leftover audio on the new active video.

Not `AUDIO_OWNERSHIP_DEFECT` on this evidence: source does not switch
`activeIndex` at mid-slide, and source does not allow A+B both
unmuted. Not `UNCONFIRMED` on the completed-swipe facts above.

Still **not PASS**. A hold-at-mid-swipe listen is required to confirm
exclusive A (and silent B) while both panes are on screen. Do not
complete the swipe on that step.

---

## ONE operator action (do not complete the swipe)

**DEVICE** = physical iPhone 13 / TestFlight **1.0.0 (14)** only.

Arabic, one step:

ابدأ تمرير بطيء من A إلى B. توقف في المنتصف (A و B ظاهران معاً تقريباً). لا تُكمل التمرير. استمع 2–3 ثوانٍ. اكتب: هل تسمع A فقط؟ هل تسمع B فقط؟ هل تسمع الاثنين معاً؟ هل أحدهما صامت؟

Do **not** ask the operator to complete the swipe this turn.
Do **not** start rapid swipe. Do **not** start Share / Create.

```text
OPERATOR_DEVICE = physical iPhone 13 / TestFlight 1.0.0 (14)
OPERATOR_ACTION = HOLD_AT_MID_SWIPE_LISTEN_ONLY
WHY_REQUIRED = Distinguish A-only intended ownership at ~50/50 vs dual unmuted preload (AUDIO_OWNERSHIP_DEFECT) vs unexpected B-only / silence
```

---

## Other smoke (not invented)

```text
FAST_SWIPE_AUDIO = NOT_TESTED
A_TO_B_TO_C = NOT_TESTED
BACK_SWIPE_AUDIO = NOT_TESTED
PARTIAL_SWIPE = NOT_TESTED
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = NOT_TESTED
PRELOADED_PLAYERS_SILENT = NOT_TESTED
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
SESSION_PERSIST_COLD = NOT_TESTED
PLAINTEXT_PASSWORD = NO
```

---

## Return

```text
CLASSIFICATION = EXPECTED_ACTIVE_POST_TRANSITION
ACTIVE_POST_SWITCH_THRESHOLD = onViewableItemsChanged + itemVisiblePercentThreshold 80 + minimumViewTime 80ms (NOT snap/index complete)
A_AUDIO_DURING_PARTIAL_SWIPE_INTENDED = YES
SIMULTANEOUS_A_PLUS_B_POSSIBLE_IN_SOURCE = NO
SLOW_SWIPE_AUDIO = PENDING_CLASSIFICATION
OPERATOR_DEVICE = physical iPhone 13 / TestFlight 1.0.0 (14)
OPERATOR_ACTION = ابدأ تمرير بطيء من A إلى B. توقف في المنتصف (A و B ظاهران معاً تقريباً). لا تُكمل التمرير. استمع 2–3 ثوانٍ. اكتب: هل تسمع A فقط؟ هل تسمع B فقط؟ هل تسمع الاثنين معاً؟ هل أحدهما صامت؟
WHY_REQUIRED = Confirm exclusive A (silent B) at mid-hold; dual audio would be AUDIO_OWNERSHIP_DEFECT. Do not complete swipe. Do not start rapid swipe.
```

---

## Safety

- P1 launch/init recorded PASS. Slow swipe not marked PASS.
- No product patch / rebuild / EAS / Production submit.
- Share / Create / fast swipe not started.
- Main mobile `77e9e28` not reset.
- `CURSOR_REPORT.md` not overwritten.
- No secrets in this report.
