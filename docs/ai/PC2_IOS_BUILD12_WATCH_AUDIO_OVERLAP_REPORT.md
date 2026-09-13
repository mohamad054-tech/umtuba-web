# PC2 iOS BUILD 12 — Watch previous-video audio overlap (RECORD ONLY)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD12_SESSION_QA_V1
DATE = 2026-08-17
PHASE = WATCH AUDIO OVERLAP RECORDED
MODE = RECORD_ONLY
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 12
IOS_BUILD_NUMBER = 12
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
BUILD_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
BUILD12_WATCH_PLAYBACK = FAIL
DEFECT = PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
FINAL_SMOKE = FAIL
DEVICE_QA_RESULT = FAIL
APP_STORE_PRODUCTION_SUBMITTED = NO
PATCH_APPLIED = NO
REBUILD = NO
CURSOR_REPORT_OVERWRITTEN = NO
SECRET_VALUES_PRINTED = NO
BLOCKERS = WATCH_PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
CENTRAL_ACTION_REQUIRED = FIX_WATCH_PLAYER_TEARDOWN_ON_ACTIVE_POST_CHANGE; NEW_SHA_THEN_NEW_IOS_BINARY
```

Read-only inspect of detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1`
at SHA `7638487d1412f070e19285fc434362b47a359ea5`. No product files
were changed.

---

## Official operator evidence (authoritative)

Physical iPhone 13 / TestFlight **1.0.0 (12)**. Do **not** ask the
operator to reproduce again.

```text
BUILD12_WATCH_PLAYBACK = FAIL
DEFECT = PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
REPRO = Watch video A plays → move to video B → video B appears → audio from video A continues
EXPECTED = When active Watch post changes, previous player must pause/stop immediately; only current video audio may play
ACTUAL = Previous video's audio overlaps the newly active video
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
FINAL_SMOKE = FAIL
```

This is **not** a crash. `CRASH_SANITY` stays **NOT_TESTED**.

---

## Already closed (do not retest, do not downgrade)

```text
LOGIN = PASS
CLOSE_REOPEN = PASS
FORCE_CLOSE_REOPEN = PASS
BACKGROUND_RESUME = PASS
DEVICE_RESTART_SESSION = PASS
LOGOUT = PASS
LOGOUT_REOPEN = PASS
SESSION_REFRESH = OBSERVED_SESSION_CONTINUITY
PLAINTEXT_PASSWORD = NO
```

---

## Smoke remaining (not invented)

```text
WATCH = FAIL
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
```

Share / Create / RTL were not continued this turn.

---

## Read-only source note (SHA 7638487d)

When the feed index changes, the previous card is **not** unmounted.
`shouldLoadPlayer(index, activeIndex)` keeps current **and adjacent**
`expo-video` instances mounted (`Math.abs(index - activeIndex) <= 1`).
iOS FlatList leaves those cells in the tree (`removeClippedSubviews`
is Android-only).

The intended stop path is `WatchPlayerPane` →
`applyPlaybackIntent(player, { shouldPlay: false, resetPosition: true })`
plus `resolveEffectiveAudio` forcing `muted: true, volume: 0` when
`isActive` becomes false. There is **no** `player.release()` (or
equivalent native teardown) on active-post change; `release()` exists
only on the unit-test session helper.

Device result: audio from video A continues after video B is on
screen. That means the previous expo-video instance did not stop
audibly. The exact native reason pause/mute failed to take effect is
**UNCONFIRMED**. Do not invent a deeper root cause. Do not patch.

---

## Return

```text
WATCH = FAIL
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
FINAL_SMOKE = FAIL
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
DEVICE_QA_RESULT = FAIL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WATCH_PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
CENTRAL_ACTION_REQUIRED = FIX_WATCH_PLAYER_TEARDOWN_ON_ACTIVE_POST_CHANGE; NEW_SHA_THEN_NEW_IOS_BINARY
```
