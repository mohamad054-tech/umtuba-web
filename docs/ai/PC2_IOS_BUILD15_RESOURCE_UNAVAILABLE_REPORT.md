# PC2 iOS BUILD 15 — Watch load / resource unavailable (RECORD ONLY)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD15_WATCH_LOAD_AUDIO_FINAL_GATE_V1
DATE = 2026-08-18
PHASE = P1 LOAD STABILITY FAIL — INVESTIGATE + RECORD
MODE = RECORD_ONLY — NO PATCH — NO REBUILD — NO PRODUCTION SUBMIT
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 15
IOS_BUILD_NUMBER = 15
EAS_BUILD_ID = 97fe339a-f338-4fb7-b0dc-62b5212b3e64
AUTHORIZED_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD_SOURCE_SHA = abf8af9e8db7453d8bcb0e4d34346f182249243b
BUILD14_SHA_COMPARED = 0ddd423f91fe238f5d211ed19a727f3180a9b48d
BUILD13_SHA_COMPARED = 700dddae332067d2182b143d4328492a22219a66
PATCH_APPLIED = NO
REBUILD = NO
OPERATOR_RETRY_ASKED = NO
OPERATOR_SWIPE_FAILED_CARDS_ASKED = NO
SEEK_RETEST_ASKED = NO
P3_STARTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
SECRET_VALUES_PRINTED = NO
DEVICE_PASS_INVENTED = NO
```

Read-only inspect of detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build15-watch-load-audio-final-gate-v1`
at SHA `abf8af9e8db7453d8bcb0e4d34346f182249243b` only. Compared
lifecycle / retry / source-retention against Build 14 worktree
`umtuba-mobile-pc2-ios-build14-cold-launch-watch-audio-qa-v1`
(`0ddd423f`) and Build 13 init-fail report (`700dddae`). Main
checkout `umtuba-mobile` at `77e9e28` was **not** reset.

Do **not** patch. Do **not** rebuild. Do **not** Submit for Review /
Production. Do **not** ask the operator to Retry, swipe failed
cards, retest seek, or start P3.

---

## Official device evidence (authoritative)

Physical iPhone 13 / TestFlight **1.0.0 (15)**.

```text
FIRST_ACTIVE_CARD = PASS
A_TO_B = PASS
B_TO_C = PASS
BACK_SWIPE_LOAD = PASS
SLOW_SWIPE_AUDIO = PASS
FAST_SWIPE_AUDIO = PASS
BACK_SWIPE_AUDIO = PASS
DUAL_AUDIO = NOT_OBSERVED
OLD_AUDIO_RESTART = NO
WATCH_PLAYER_ITEM_LOAD = FAIL_INTERMITTENT
RESOURCE_UNAVAILABLE_REPRODUCED = YES
VISIBLE_ERROR = Failed to load the player item: resource unavailable
RETRY_RECOVERY = UNRELIABLE
MULTIPLE_VIDEO_PLAYBACK_STABILITY = FAIL_INTERMITTENT
PARTIAL_SWIPE_AUDIO = NOT_COMPLETED_DUE_TO_LOAD_FAILURE
BACKGROUND_RESUME_AUDIO = NOT_TESTED
P3_SMOKE = NOT_STARTED
ONLY_ACTIVE_AUDIO = PASS_FOR_COMPLETED_SLOW_FAST_BACKWARD_TRANSITIONS
PLAYBACK_UNAFFECTED = FAIL
DEVICE_QA_RESULT = FAIL
APP_STORE_PRODUCTION_SUBMITTED = NO
WATCH_SEEK_SCRUBBER = OBSERVATION_ONLY_DO_NOT_RETEST
```

The error appeared **after** multiple previously successful video
transitions, not on the first card. Retry ("إعادة المحاولة") is
not a clean reload; it may expose/toggle stop/continue.

This is **not** the Build 13 SharedObject use-after-release at
cold launch (that class did not reproduce on first-card / A→B /
B→C / back). This is **not** the Build 4 class of *all* videos
failing from first play. Same on-screen string; different timing.

---

## Return fields

```text
RESOURCE_UNAVAILABLE_ROOT_CAUSE = MOST_LIKELY_IOS_AVPLAYERITEM_LOAD_AFTER_REPEATED_RELEASE_RECREATE — UNCONFIRMED as a single proven cause. See candidates below.
RETRY_ROOT_CAUSE = HIT_TEST_COVERS_RETRY_PLUS_IN_PLACE_REPLACE_NOT_REMOUNT — source-proven layout matches operator toggle; replaceAsync path is not a clean reload.
RELATED_TO_PLAYER_LIFECYCLE_FIX = PARTIAL
SHARED_OR_IOS_SPECIFIC = SHARED_JS_PATH; VISIBLE_ERROR_STRING_IOS_AVPLAYER
ANDROID_IMPACT = SAME_JS_UNCONFIRMED_ON_DEVICE
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
NEW_IOS_BUILD_REQUIRED = YES
BUILD15_RELEASE_STATUS = FAIL_INTERMITTENT_LOAD
CENTRAL_ACTION_REQUIRED = NEW_SHA_FOR_PLAYER_SOURCE_LIFETIME_AND_RETRY_SEMANTICS; NEW_IOS_BINARY; DO_NOT_SHIP_BUILD15; PC2_IDLE; NO_OPERATOR_RETEST
```

---

## 1. Why a working player/source later becomes resource unavailable

**Not proven from source alone.** Most likely candidate + UNCONFIRMED.

Visible string is expo-video iOS `PlayerItemLoadException` wrapping
`AVPlayerItem.error` / transport `localizedDescription` when item
status is `.error` (`expo-video/ios/VideoPlayerObserver.swift`,
`VideoExceptions.swift`). `sanitizePlaybackError` → `getErrorMessage`
passes the native text through. Industry mapping for the suffix
**resource unavailable** remains NSURLErrorDomain **-1008** (AVPlayer
failed to fetch the media resource). Device OS log for this Build 15
fail was **not** fetched. Do not invent `-1008` as confirmed.

What source **does** show:

1. **Early window works.** Current + adjacent (`shouldLoadPlayer` =
   `|index - active| <= 1`) mount `WatchPlayerPane` → `useVideoPlayer(src)`.
   First-card / A→B / B→C / back load PASS matches that path.

2. **Leaving the ±1 window destroys the native player.**
   `shouldLoadPlayer` false renders a placeholder. `WatchPlayerPane`
   unmounts. `useReleasingSharedObject` calls native `release()`.
   iOS `VideoPlayer` deinit clears the item with
   `replaceCurrentItem(with: nil)` **async on the main queue**.
   Source is **not** retained across that unmount.

3. **Re-entering the window creates a new player with the old URL.**
   Remount calls `useVideoPlayer(video.src)` using the feed-time
   signed URL. There is **no** proactive `refreshPlaybackUrl` on
   activate / remount. `refreshPlaybackUrl` runs only from Retry
   (`onRefreshSrc`). TTL is `VIDEO_SIGNED_URL_TTL_SECONDS = 15 * 60`.
   Helper `isLikelyExpiredPlaybackUrl` exists but is **unused** in
   the product Watch path. The string "resource unavailable" does
   **not** match that heuristic anyway.

4. **Build 15 unmount no longer pauses before release.**
   Build 14 (`0ddd423f`) cleanup called `applyInactiveAudioTeardown`
   (mute / volume 0 / loop false / `pause()`) on the still-alive
   object, then native release. Build 15 (`abf8af9e`) only
   `detachWatchPlayerBinding` (mark dead, drop refs, clear
   generation) and **never** calls play/pause/mute on teardown.
   Native `release()` still runs. A player that was loading or
   playing can be released while AVPlayer is still fetching.
   The next swipe immediately constructs a new adjacent player.

5. **Overlap during a swipe.** At index N the feed holds three
   native players (N-1, N, N+1). Swipe to N+1 unmounts N-1 and
   mounts N+2 in the same turn. Combined with (4) and async item
   clear (2), two create/release cycles can overlap. iOS
   AVPlayerItem load failing later as "resource unavailable" is
   compatible with that race. It is **not** proven.

TTL expiry is a real source gap for remounts after 15 minutes or
for a first-page URL used late. A short QA session of a few
successful swipes is **less** likely to be TTL-only, but session
duration was not recorded. Do not pick TTL as the proven cause.

Build 4 used the same on-screen string for *all* first plays and
was **not** explained by a JS URL/ATS delta. Do not collapse this
intermittent-after-success fail into that unconfirmed class.

```text
MOST_LIKELY_CANDIDATE = RELEASE_WHILE_LOADING_THEN_RECREATE_ADJACENT_PLAYER (Build 15 detach-without-pause + shouldLoadPlayer ±1 remount + async iOS item clear)
ALSO_OPEN = STALE_SIGNED_URL_ON_REMOUNT (15 min TTL; no activate refresh)
PROVEN_FROM_SOURCE_ALONE = NO
DEVICE_OS_LOG = NOT_FETCHED
```

---

## 2. Player / source lifetime across activate / deactivate

| State | Native player | Source |
| --- | --- | --- |
| Active (`isActive`, `shouldLoadPlayer`) | Mounted; ownership effect `play()` | Feed `video.src` (signed at page fetch) |
| Adjacent (`!isActive`, `shouldLoadPlayer`) | **Kept mounted**; pause + mute + loop false | Same `src` retained |
| Off-window (`!shouldLoadPlayer`) | **Unmounted / released** | `src` string stays on the JS video object; native item discarded |
| Back into ±1 | **New** `useVideoPlayer(src)` | Same original `src`; no refresh |

`ownershipGeneration` / `playbackGeneration` gates play/pause. It
does **not** recreate the player. `useVideoPlayer` recreates only
when `JSON.stringify(parsedSource)` changes (new `src` string) or
the pane remounts.

Adjacent preload is silent by contract
(`ONLY_ACTIVE_WATCH_POST_CAN_PRODUCE_AUDIO`). That contract held
for the completed slow/fast/back transitions. It does not keep
the native item alive once the card leaves ±1.

---

## 3. Preload ownership and source retention

```text
shouldLoadPlayer = Math.abs(index - activeIndex) <= 1
NATIVE_PLAYERS_STEADY_STATE = 3
SOURCE_RETAINED_WHILE_ADJACENT = YES
SOURCE_RETAINED_AFTER_RELEASE = NO (JS URL string only)
PROACTIVE_REFRESH_ON_REMOUNT = NO
```

`windowSize={5}` keeps extra RN cells. Only ±1 mount
`WatchPlayerPane`. `removeClippedSubviews` is Android-only.

---

## 4. Release / recreate races (source)

`useReleasingSharedObject`:

- **Unmount:** cleanup `release()`s the current SharedObject.
- **`src` change:** new player is created during render; previous
  `release()` runs in `useEffect` after commit. Both objects exist
  briefly.

Build 15 `useLayoutEffect([player])` on swap/unmount: detach JS
only. Then Expo `release()`. iOS deinit clears the item async.
A newly mounted adjacent pane can start `VideoPlayer(src)` before
the previous item is nilled.

Retry `onRefreshSrc` → `patchVideo({ src })` changes `src` while
`onRetry` still awaits on the **old** `player` from the closure.
After remount, `canTouchBoundPlayer()` is false
(`boundPlayerRef.current === player` fails). Retry returns
without `replaceAsync` on the new object. The new constructor
load may still run. This race is **retry-path**, not the first
spontaneous fail (operator had not been asked to Retry before
the error appeared).

```text
RELEASE_RECREATE_RACE_PRESENT_IN_SOURCE = YES
PROVEN_AS_THIS_DEVICE_FAIL = UNCONFIRMED
```

---

## 5. Retry semantics (matches operator)

Retry is **not** a remount of `WatchPlayerPane` and **not** a new
`useVideoPlayer` unless `src` changes under it.

`onRetry`:

1. Sets `status` to `"loading"`, clears the error text.
2. Returns immediately if `!canTouchBoundPlayer()` (released /
   rebound player). Overlay can stick on spinner. No new player.
3. Optional `refreshPlaybackUrl`; on failure/`null`, keeps the
   **same** `src`.
4. `await player.replaceAsync(nextSrc)` on the **existing**
   SharedObject (`replaceCurrentItem`). Same-URL replace of a
   failed `AVPlayerItem` is not a guaranteed new load.
5. Bumps `retryToken` → ownership effect re-runs
   `applyPlaybackIntent` (`play()` or pause/mute).
6. If still the audio owner, `player.play()` again.

That is in-place replace + pause/play, not a clean media reload.

**Hit-testing (source-proven; matches “toggles stop/continue”):**

The error + Retry control live in `WatchPlayerPane` `playerWrap`
(no `zIndex`). The card overlay is a later sibling with
`zIndex: 4` / `elevation: 4`. Full-screen `tapLayer`
(`absoluteFill`, `right: WATCH_VOLUME_RIGHT_CLEARANCE` = 68)
calls `onTogglePlayPause` (sets `userPaused`, shows play/pause
feedback). The centered Retry button sits under that layer.
A tap on "إعادة المحاولة" is expected to toggle stop/continue
rather than run `onRetry`.

```text
RETRY_RELOADS_MEDIA = NO
RETRY_MAY_TOGGLE_PAUSE_PLAY = YES (tap layer above Retry; also play() after replaceAsync)
RETRY_ON_RELEASED_OR_STALE_PLAYER = YES (early return if rebound/released)
RETRY_RECOVERY = UNRELIABLE
```

Do **not** ask the operator to tap Retry again.

---

## 6. AVPlayerItem / expo-video invalidation

iOS `replaceAsync` → `replaceCurrentItem` loads an `AVAsset` off
the main thread, then `AVPlayer.replaceCurrentItem` on main.
A cancelled loader resolves without applying a source.
`reloadIfFailed` / `reloadCurrentSource` exist in native
expo-video and are **not** invoked from Watch JS.

After `release()`, later JS method calls throw (Build 13 class).
Build 15 guards that with detach + `isPlayerAlive`. That does
**not** recreate a valid `AVPlayerItem` when the item itself
failed with resource unavailable.

Android expo-video has **no** `PlayerItemLoadException` /
"resource unavailable" string. Same JS hook
(`useVideoPlayer` + `useReleasingSharedObject` + `replaceAsync`).

---

## 7. Android parity

```text
SAME_JS_PATH = YES
shouldLoadPlayer = shared
detachWatchPlayerBinding = shared
onRetry / replaceAsync / tapLayer z-order = shared
VISIBLE_ERROR_STRING = iOS expo-video only
ANDROID_DEVICE_RESULT_THIS_GATE = NOT_TESTED
ANDROID_IMPACT = SAME_JS_UNCONFIRMED_ON_DEVICE
```

Do not invent Android PASS or FAIL. A future SHA that changes
this JS path can affect Android. No Android `versionCode` change
this turn.

---

## 8. Relation to the Build 15 player-lifecycle fix

`abf8af9e` vs Build 14 `0ddd423f` (Watch product delta):

- Unmount/swap: detach JS only; no play/pause/mute on teardown.
- `shouldCallPlayerMethodsOnUnmount() === false`.
- Native release still owned by `useReleasingSharedObject`.
- `shouldLoadPlayer` ±1 and exclusive audio contract unchanged.
- iOS build stamp 15 / Android versionCode 16 in SHA only.

That fix is the intended repair for Build 13 SharedObject
use-after-release at init. First-card / A→B / B→C / back **load**
PASS on Build 15 is compatible with that repair working at init.

The same change is the only Watch teardown delta that can leave
AVPlayer fetching at `release()` time. Causal link to this later
intermittent item-load fail is **PARTIAL / UNCONFIRMED**. Build 14
device QA never closed a long multi-video load-stability gate, so
Build 15 is not a proven regression versus a Build 14 PASS on this
exact class.

```text
RELATED_TO_PLAYER_LIFECYCLE_FIX = PARTIAL
```

---

## 9. Central action

Build 15 is **not** shippable. Root cause is not proven from
source alone; a new SHA is still required.

```text
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
NEW_IOS_BUILD_REQUIRED = YES
BUILD15_RELEASE_STATUS = FAIL_INTERMITTENT_LOAD
APP_STORE_PRODUCTION_SUBMITTED = NO
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
CENTRAL_ACTION_REQUIRED =
1. Produce ONE new authoritative shared mobile SHA.
2. Address player/source lifetime across repeated ±1 release/recreate (do not leave item-load races; remount must not reuse a dead/stale item).
3. Address Retry: overlay must receive the tap; Retry must reload media, not toggle pause/play on a failed/stale player.
4. Treat signed-URL remount without refresh as an open lifetime gap (TTL 15 min) — do not assume it is this session's proven cause.
5. Authorize the next unused iOS build number. Do not reuse Build 15 / SHA abf8af9e.
6. Do not Submit Production on Build 15.
7. PC2 stays idle. Do not ask the operator to Retry, swipe failed cards, retest seek, or start P3.
```

---

## Safety

- No product patch / rebuild / EAS / Production submit.
- No operator action asked.
- Seek left as observation only.
- P2 partial / resume and P3 left incomplete / not started.
- Completed swipe-audio PASS fields not converted to FAIL.
- Main mobile `77e9e28` not reset.
- `CURSOR_REPORT.md` not overwritten.
- No secrets in this report.
