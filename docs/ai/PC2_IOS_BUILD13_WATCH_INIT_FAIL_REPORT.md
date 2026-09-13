# PC2 iOS BUILD 13 — cold launch / Watch init FAIL (RECORD ONLY)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD13_WATCH_AUDIO_OWNERSHIP_QA_V1
DATE = 2026-08-17
PHASE = P1 BLOCKED AT LAUNCH / WATCH INIT
MODE = RECORD_ONLY
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 13
IOS_BUILD_NUMBER = 13
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
BUILD_SOURCE_SHA = 700dddae332067d2182b143d4328492a22219a66
BUILD12_SHA_NOT_REUSED = 7638487d1412f070e19285fc434362b47a359ea5
COLD_LAUNCH = FAIL
WATCH_INITIALIZATION = FAIL
EXPO_SHARED_OBJECT_ERROR = YES
AUDIO_STILL_AUDIBLE_DURING_ERROR = YES
SLOW_SWIPE_AUDIO = NOT_TESTED
FAST_SWIPE_AUDIO = NOT_TESTED
A_TO_B_TO_C = NOT_TESTED
BACK_SWIPE_AUDIO = NOT_TESTED
PARTIAL_SWIPE = NOT_TESTED
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = NOT_TESTED
PRELOADED_PLAYERS_SILENT = NOT_TESTED
DEVICE_QA_RESULT = FAIL_AT_LAUNCH/WATCH_INIT
APP_STORE_PRODUCTION_SUBMITTED = NO
PATCH_APPLIED = NO
REBUILD = NO
OPERATOR_SWIPE_ASKED = NO
BUILD12_SESSION_RETESTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
SECRET_VALUES_PRINTED = NO
CRASH_SIGNATURE = NOT_INVENTED
DEVICE_OS_LOG = NOT_FETCHED
ASC_CRASH_LOG = NOT_FETCHED
EAS_BUILD_LOG_SHAREDOBJECT = NO
BLOCKERS = COLD_LAUNCH_FAIL; WATCH_INITIALIZATION_FAIL; EXPO_SHARED_OBJECT_ERROR; AUDIO_STILL_AUDIBLE_DURING_ERROR; SWIPE_AUDIO_OWNERSHIP_GATES_NOT_STARTED; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
CENTRAL_ACTION_REQUIRED = FIX_WATCH_INIT_SHAREDOBJECT_USE_AFTER_RELEASE; NEW_SHA_THEN_NEW_IOS_BINARY
```

Read-only inspect of detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build13-watch-audio-qa-v1`
at SHA `700dddae332067d2182b143d4328492a22219a66`. Main checkout
`umtuba-mobile` at `77e9e28` was **not** reset. No product files
were changed.

---

## Official operator evidence (authoritative)

Physical iPhone 13 / TestFlight **1.0.0 (13)**. Do **not** ask the
operator to swipe or reproduce again.

```text
BUILD13_COLD_LAUNCH = FAIL
WATCH_INITIALIZATION = FAIL
EXPO_SHARED_OBJECT_ERROR = YES
AUDIO_STILL_AUDIBLE_DURING_ERROR = YES
SLOW_SWIPE_AUDIO = NOT_TESTED
FAST_SWIPE_AUDIO = NOT_TESTED
A_TO_B_TO_C = NOT_TESTED
BACK_SWIPE_AUDIO = NOT_TESTED
PARTIAL_SWIPE = NOT_TESTED
BACKGROUND_RESUME_AUDIO = NOT_TESTED
ONLY_ACTIVE_AUDIO = NOT_TESTED
PRELOADED_PLAYERS_SILENT = NOT_TESTED
DEVICE_QA_RESULT = FAIL_AT_LAUNCH/WATCH_INIT
APP_STORE_PRODUCTION_SUBMITTED = NO
```

The app did **not** reach the Watch swipe audio-ownership gate.
Those fields stay `NOT_TESTED`. They are **not** FAIL and **not** PASS.

This is **not** a Build 12 session retest. Session persistence from
Build 12 is not reopened here.

---

## AUDIO_STILL_AUDIBLE_DURING_ERROR (observed only)

Operator heard audio while the SharedObject error was showing.

Recorded as **observed**. Do **not** treat this as proof that the
Build 12 class `PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO` is
still present. Swipe A→B was never run.

Compatible readings, neither proven:

1. Error UI on one Watch card while another mounted expo-video
   instance still emits audio (preload / adjacent card).
2. Error UI while the same clip’s native AVPlayer keeps playing.

Do not over-claim.

---

## Logs

```text
EAS_BUILD_ID = db467f4d-5fce-430b-98f7-60c74d8c1ed8
EAS_BUILD_STATUS = FINISHED
EAS_BUILD_ERROR = NONE
EAS_BUILD_LOG_SHAREDOBJECT = NO
EAS_LOG_CLASS = COMPILE_TIME_ONLY
ASC_CRASH_LOG = NOT_FETCHED
TESTFLIGHT_DEVICE_LOG = NOT_FETCHED
CRASH_SIGNATURE = NOT_INVENTED
```

EAS `build:view` matches SHA `700dddae` / appBuildVersion **13**.
Two EAS workflow log files were fetched and searched for
`SharedObject` / `already released` / `ERR_NATIVE_SHARED`. **Zero
hits.** Those logs are the iOS compile job, not the iPhone session.

ASC / TestFlight device crash logs were **not** fetched (no safe
client this turn; no operator reopen). Do **not** invent a native
crash signature. Operator evidence is an Expo SharedObject **error**
at Watch init, not a confirmed `EXC_CRASH` / dyld abort.

---

## Read-only source note (700dddae vs 7638487d)

One commit. 8 files, +591 / −41. Watch / player files only:

| File | Delta |
| --- | --- |
| `app/(tabs)/watch.tsx` | `playbackGeneration` + `claimActiveIndex` bump on active-index change |
| `components/WatchVideoCard.tsx` | generation-gated play; mute+pause+disable-loop teardown; new listeners; unmount teardown |
| `src/lib/watch/activePlayerOwnership.ts` + test | exclusive owner + generation gate (new) |
| `src/lib/watch/playerSession.ts` + test | `applyInactiveAudioTeardown` |
| `app.config.ts` / `appStoreConfig.test.ts` | iOS 13 / Android 14 stamp |

`expo-video` / `expo-modules-core` lockfile versions are **unchanged**
vs Build 12. No new `player.release()` in product Watch code.

`useVideoPlayer` still uses `useReleasingSharedObject`. That hook
calls native `SharedObject.release()` when the player identity
changes and again on pane unmount. Expo documents that later native
calls on that object throw.

Build 13 adds **more** JS writes against that same object:

- `applyInactiveAudioTeardown` = `muted=true`, `volume=0`,
  `loop=false`, `pause()` (optional seek then pause).
- Call sites: `useLayoutEffect` when the card is not the audio
  owner; `statusChange` / `playToEnd` / `playingChange` when stale
  or unexpected; retry else-branch; **new** `useEffect` cleanup on
  `[player]` that teardowns on unmount / player swap.

Unit tests (`preload adjacent cards are silent and not released`)
assert the app does **not** call `release()`. The native object is
still released by expo-video’s hook.

Likely class (source-level, **not** a confirmed device stack):

Watch init mounts current + adjacent `WatchPlayerPane`s. The new
teardown path can run `muted` / `pause` / `loop` after
`useReleasingSharedObject` has already released the player
(unmount cleanup order: Expo `release()` is registered before the
new teardown effect). Late `timeUpdate` / `playingChange` /
`playToEnd` also read or write the player with no try/catch.
`sanitizePlaybackError` can surface a SharedObject message on the
Watch overlay; an uncaught throw can also show as an Expo error.

That is **use-after-release** of an expo-video `SharedObject`, not
a second app-level `release()`. Whether the on-device error is
exactly this path is **UNCONFIRMED** without a device stack.

Do not invent a deeper root cause. Do not patch.

---

## Return

```text
COLD_LAUNCH = FAIL
WATCH_INITIALIZATION = FAIL
EXPO_SHARED_OBJECT_ERROR = YES
AUDIO_STILL_AUDIBLE_DURING_ERROR = YES
ONLY_ACTIVE_AUDIO = NOT_TESTED
DEVICE_QA_RESULT = FAIL_AT_LAUNCH/WATCH_INIT
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = COLD_LAUNCH_FAIL; WATCH_INITIALIZATION_FAIL; EXPO_SHARED_OBJECT_ERROR; AUDIO_STILL_AUDIBLE_DURING_ERROR; SWIPE_AUDIO_OWNERSHIP_GATES_NOT_STARTED; APP_STORE_REVIEW_NOT_SUBMITTED; NO_PRODUCT_PASS
CENTRAL_ACTION_REQUIRED = FIX_WATCH_INIT_SHAREDOBJECT_USE_AFTER_RELEASE; NEW_SHA_THEN_NEW_IOS_BINARY
```

---

## Safety

- No product patch / rebuild / EAS / Production submit.
- Swipe gates left `NOT_TESTED`.
- Operator not asked to swipe or reopen for logs.
- Build 12 session gate not rerun.
- Main mobile `77e9e28` not reset.
- `CURSOR_REPORT.md` not overwritten.
- No secrets in this report.
