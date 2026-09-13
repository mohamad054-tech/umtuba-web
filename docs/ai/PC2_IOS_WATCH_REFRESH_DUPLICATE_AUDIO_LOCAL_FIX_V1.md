# PC2 iOS Watch refresh duplicate-audio local fix V1

**Date:** 2026-08-21  
**Device:** PC2  
**Role:** `IOS_LOCAL_FIX_EXECUTOR`  
**TASK_ID:** `PC2_IOS_WATCH_REFRESH_DUPLICATE_AUDIO_LOCAL_FIX_V1`  
**PC2 LOCAL FIX GO:** YES  
**Worktree:** `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-playback-p1-build22-v1`

## Root-cause analysis

Inspected Watch playback at BASE_SHA `48c510fa31557f645c292388b37195bc88a852a6`.

`app/(tabs)/watch.tsx` `loadInitial({ soft: true })` replaces `videos` and calls `claimActiveIndex(0)`. When the viewer is already on index 0, `bumpWatchOwnerGeneration` does **not** increment, so ownership stays the same.

Each card’s `WatchPlayerPane` uses `useVideoPlayer(src, …)` with `audioMixingMode = "mixWithOthers"`. A feed replace (new signed URL and/or remount) yields a **new** expo-video SharedObject / AVPlayer. The previous pane’s `useLayoutEffect` cleanup only called `detachWatchPlayerBinding` (mark dead, drop JS refs). Comments and `shouldCallPlayerMethodsOnUnmount()` explicitly forbade play/pause/mute on unmount because calling methods **after** `useReleasingSharedObject` release caused Build 15 “resource unavailable”. Native release is deferred. The old AVPlayer therefore kept decoding audio while the new one started. A second pull-to-refresh stacked a third stream. That matches the iPhone 13 / 1.0.0 (22) reproduction.

Mute-only would not have been a correct fix. The required lifecycle is: **pause/stop the still-alive player, then detach, then let native release run**. Methods are still never called after detach/release.

## What changed (smallest safe fix)

1. `retireWatchPlayerWhileAlive` — if the SharedObject is still alive, run existing `applyInactiveAudioTeardown` (mute + volume 0 + loop false + **pause**), then detach JS.
2. `WatchPlayerPane` swap/unmount uses retire, not detach-only.
3. Soft/hard feed replace bumps `feedPlaybackEpoch` and force-bumps `playbackGeneration` **before** `setVideos`, even when the active index stays 0. Pane keys include the epoch so obsolete panes remount after retire.
4. `SelectedSoundPlayer` tears down on player identity / unmount so added-sound mix cannot outlive the card.
5. Regression tests cover refresh/replacement, unmount retire, and epoch remount.

Ordinary re-renders do not recreate players: `shouldRecreateWatchPlayer` still requires postKey / src / instanceGeneration change. Epoch only increments on feed replace.

## Why it is safe

- Pause happens **while the player is still bound**, then JS is marked dead. Build 15 post-release method calls stay forbidden (`shouldCallPlayerMethodsOnUnmount === false`).
- No global audio session / category / mix-mode hack. `mixWithOthers` is unchanged; obsolete players are stopped instead.
- Mute is not used as a substitute; teardown includes `pause()`.
- Build 22 header overlay (`watchHeaderOverlayLayerStyle("ios") === {}`) untouched.
- Watch history (`VIDEO_HISTORY_STACK_GROWTH = 0`) and header-arrow resolver untouched.
- Profile and signup files untouched.
- Primary dirty checkout not reset.

## Cleanup coverage

| Event | Behavior |
| --- | --- |
| Pull-to-refresh / feed replace | Epoch + ownership bump; pane remount; retire old player before new play |
| Item replaced (same list key, new src/epoch) | Player identity change → retire previous SharedObject |
| Component unmount | Layout-effect cleanup retires then detaches |
| Active video identity / index change | Existing ownership teardown plus retire if the pane unmounts |

## Preservation checks

- **Build 22 playback/zIndex:** `src/lib/watch/watchHeaderOverlay.ts` unchanged; header overlay tests still pass.
- **Watch history:** `src/lib/nav/watchRootExit.ts` unchanged; `VIDEO_HISTORY_STACK_GROWTH = 0`; root-exit tests still pass.
- **Watch header arrow:** `resolveWatchHeaderArrowNavigation` unchanged.
- **Profile:** no Profile files edited.
- **Signup referral/localization:** `app/(auth)/signup.tsx` unchanged.

## Tests / typecheck

```text
npx vitest run src/lib/watch/playerLifecycle.test.ts src/lib/watch/watchHeaderOverlay.test.ts src/lib/nav/watchRootExit.test.ts
→ 3 files, 39 tests, pass

npx tsc --noEmit
→ pass (exit 0)

git diff --check
→ pass
```

## Official fields

```text
TASK_ID = PC2_IOS_WATCH_REFRESH_DUPLICATE_AUDIO_LOCAL_FIX_V1
STATUS = LOCAL_FIX_IMPLEMENTED_REPORT_ONLY
BASE_SHA_VERIFIED = YES
ROOT_CAUSE = Pull-to-refresh created a new expo-video/AVPlayer while unmount/swap only detached JS and never paused the still-alive previous player; mixWithOthers let obsolete streams keep playing and stack on each refresh.
FILES_CHANGED = src/lib/watch/playerLifecycle.ts; src/lib/watch/playerLifecycle.test.ts; components/WatchVideoCard.tsx; app/(tabs)/watch.tsx; components/sounds/SelectedSoundPlayer.tsx; docs/ai/CURRENT_TASK.md; docs/ai/CURSOR_REPORT.md; docs/ai/PC2_IOS_WATCH_REFRESH_DUPLICATE_AUDIO_LOCAL_FIX_V1.md
FIX_IMPLEMENTED = YES
PLAYER_CLEANUP_BEHAVIOR = retireWatchPlayerWhileAlive pauses/stops a still-alive player then detaches JS; methods are never called after detach/release
REFRESH_CLEANUP = YES
UNMOUNT_CLEANUP = YES
ACTIVE_VIDEO_CHANGE_CLEANUP = YES
BUILD22_PLAYBACK_FIX_PRESERVED = YES
WATCH_HISTORY_FIX_PRESERVED = YES
WATCH_ARROW_FIX_PRESERVED = YES
PROFILE_PRESERVED = YES
SIGNUP_FIXES_PRESERVED = YES
TARGETED_TESTS = PASS (39; includes refresh/replacement cannot leave multiple active playback instances)
TYPECHECK = PASS
BUILD_CHECK = SKIPPED_NO_EAS_NO_TESTFLIGHT
SOURCE_SHA_AFTER_FIX = 48c510fa31557f645c292388b37195bc88a852a6 + uncommitted worktree local fix (no commit)
TESTFLIGHT_UPLOAD = NO
BUILD_23_CREATED = NO
READY_FOR_IPHONE13_RETEST_BUILD = YES
BLOCKERS = NONE_FOR_LOCAL_FIX; IPHONE13_RETEST_REQUIRES_LATER_AUTHORIZED_BUILD
```
