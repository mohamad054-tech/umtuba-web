# DESKTOP_ANDROID_17CBFEF_FOLLOW_LIST_STACK_RETEST

Physical Fold6 follow-list stack retest on SHA `17cbfefbc8c77d5286efdf2c9b941101db84b6c3`. SOURCE_PATCHED = NO. No Play upload. No production AAB. Targeted retest only (not broad Watch QA). Do not rebuild or retest 7e5f734.

## Central final report

```
TASK_ID = DESKTOP_ANDROID_17CBFEF_FOLLOW_LIST_STACK_RETEST
STATUS = PASS
DATE = 2026-08-23
OPERATOR = DESKTOP
MACHINE = DESKTOP
DEVICE = Galaxy Z Fold6 RFCX718LVHK / SM-F956B
PACKAGE = com.umtuba.app
AUTHORITATIVE_SHA_REQUIRED = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
SOURCE_SHA = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
SOURCE_SHA_VERIFIED = YES
INSTALLED_SHA = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
GIT_REV_PARSE_HEAD = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
INSTALL_METHOD = adb install -r EAS preview APK c6e73333 (one preview queued; none existed for this SHA)
EAS_BUILD_ID = c6e73333-6629-40eb-9d31-4fde666856a7
APK_IDENTITY = com.umtuba.app 1.0.0 versionCode 20 SHA256 7F0A591B538D27B5F2D420E98D0F20E6269FAA0C3D40CCAB99A02863BAA5C4AC
APK_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-17CBFEF-FOLLOW-LIST\docs\ops\android-17cbfef-follow-list-stack-retest\evidence\build\apk\umtuba-android-preview-c6e73333.apk
APK_SIZE = 148613640
APK_SHA256 = 7F0A591B538D27B5F2D420E98D0F20E6269FAA0C3D40CCAB99A02863BAA5C4AC
DEVICE_BASE_APK_SHA256 = 7F0A591B538D27B5F2D420E98D0F20E6269FAA0C3D40CCAB99A02863BAA5C4AC
ANDROID_VERSION_CODE = 20
WORKTREE_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-17CBFEF-FOLLOW-LIST
FOLLOWERS_FULL_STACK = PASS
FOLLOWING_FULL_STACK = PASS
FOLLOW_LIST_PROFILE_OSCILLATION = ABSENT
ONE_BACK_ONE_LEVEL = PASS
WATCH_INSTANCE_PRESERVED_AFTER_FOLLOWERS = PASS
WATCH_INSTANCE_PRESERVED_AFTER_FOLLOWING = PASS
WATCH_PROFILE_BACK_SMOKE = PASS
WATCH_REMOUNT_OBSERVED = NO
WATCH_INSTANCE_PRESERVED = PASS
NO_OWN_PROFILE_FALLBACK = PASS
HOME_DISCOVER_ORIGIN_PRESERVED = PASS
OWN_PROFILE_ORIGIN_PRESERVED = PASS
ANDROID_HARDWARE_BACK = PASS
HEADER_BACK = PASS
ONE_ACTIVE_PLAYER = PASS
NO_AUDIO_OVERLAP = PASS
NO_PROLONGED_LOADING_REGRESSION = PASS
NEW_DEFECTS = NONE
SOURCE_PATCHED = NO
GOOGLE_PLAY_UPLOAD = NO
PRODUCTION_SUBMISSION = NO
DESKTOP_FINAL_STATUS = PASS
D_PATH = ABSENT
NEXT_ACTION = STOP_AND_WAIT_FOR_CENTRAL
```

## Identity / source gate

- Machine: DESKTOP. Not PC2. Not iPhone/TestFlight.
- Mobile parent `C:\Users\1\Desktop\umtuba\umtuba-mobile` dirty at `3b33561` — not reset, not used.
- NEW detached worktree `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-17CBFEF-FOLLOW-LIST`
- `git rev-parse HEAD` = `17cbfefbc8c77d5286efdf2c9b941101db84b6c3`
- Commit: `fix(mobile): unwind follow-list Back one level without inheriting member via.`
- Parent/base `7e5f7347674848ad23e07a12850398c1a19b7cc1` (historical remount PASS / follow-list FAIL). Prior remount worktree not checked out onto 17cbfef.
- Product source CLEAN. Only `?? docs/ops/` plus gitignored `node_modules` junction to V20 after lockfile SHA256 match `733D3666…2793E8`.
- `app.config.ts` `versionCode: 20` / `version: 1.0.0`. No bump.
- Session: `@playreview` persisted after `adb install -r`. Other-user clips `@mohamad`. Followers member `@marenapost`. Following member `@khader`. Own Following member `@mohamad` after a temporary Follow (unfollowed before closeout).

## Install / dumpsys

- EAS list had no preview for 17cbfef. Latest prior preview was 7e5f734 `ad6fd68e`.
- Queued ONE preview only: `c6e73333-6629-40eb-9d31-4fde666856a7`. `gitCommitHash` exact SHA. Profile `preview`. versionCode 20. No production AAB. No second queue.
- `adb -s RFCX718LVHK install -r` Success.
- dumpsys: `versionCode=20` `versionName=1.0.0` `targetSdk=36` `lastUpdateTime` 2026-08-23 01:14:41
- aapt: `package: name='com.umtuba.app' versionCode='20' versionName='1.0.0'`
- Device `base.apk` SHA256 `7F0A591B…A5C4AC` matches disk APK.

## Followers full stack — PASS

Watch (paused `@mohamad` 2:15 singing) → Profile `@mohamad` (Follow, not Edit) → Followers (`@marenapost`) → member Profile `@marenapost` → hardware Back → SAME Followers list → hardware Back → originating Profile `@mohamad` → hardware Back → SAME Watch `@mohamad` 2:15.

Extra hardware Back on Watch stayed on Watch (did not return to Followers). Isolated second Back after >1800ms stayed on Watch.

Evidence: `A-watch-other.png`, `B-profile-mohamad.png`, `C-followers-list.png`, `D-followers-member.png`, `E-back-followers-list.png`, `F-back-origin-profile.png`, `G-back-watch.png`, `H-extra-back-watch.png`, `H2-rearm-watch.png`, `followers-chain-log.txt`.

## Following full stack — PASS

Same Watch `@mohamad` 2:15 (clock 0:49 playing) → Profile → Following (`@khader`) → member `@khader` → hardware Back → SAME Following list → hardware Back → originating Profile `@mohamad` → hardware Back → SAME Watch `@mohamad` 2:15 (clock 1:05 playing; instance continued).

Evidence: `I-watch-before-following.png`, `I-profile.png`, `J-following-list.png`, `K-following-member.png`, `L-back-following-list.png`, `M-back-origin-profile.png`, `N-back-watch.png`, `following-chain-log.txt`.

`FOLLOW_LIST_PROFILE_OSCILLATION = ABSENT`. `ONE_BACK_ONE_LEVEL = PASS`. This closes the 7e5f734 / 34e42cc list↔profile trap on this SHA.

## Preserve remount (3 cycles) — PASS / remount not observed

Watch playing `@mohamad` Funny Goat 1:02 → Profile → Back → SAME Watch.

| Cycle | Back | Before | After |
|---|---|---|---|
| 1 | Hardware | Funny Goat 1:02 @ 0:25 | Funny Goat 1:02 @ 0:37 |
| 2 | Header 868,168 (RTL right) | same clip continues | Funny Goat 1:02 @ 0:53 |
| 3 | Hardware | clip near end + Auto-next on | next `@mohamad` 0:32 rain/MALAK @ 0:10 |

Cycles 1–2 preserve the same mounted clip (clock continues; no reset to 0:00; no reload). Cycle 3 clip change is Auto-next after 1:02 ended, not Profile-Back remount of the same instance. `WATCH_REMOUNT_OBSERVED = NO`. `NO_OWN_PROFILE_FALLBACK = PASS` (Report/Block, not own Edit).

Evidence: `P-c1-before.png`, `P-c1-profile.png`, `P-c1-return.png`, `P-c2-return.png`, `P-c3-return.png`, `remount-3x-log.txt`. Stale uiautomator XML while PLAYING must not override screenshots.

## Non-Watch origins — PASS

**Discover:** Discover cards open Watch, not Profile. Reachable chain: Discover → `@mohamad` card Watch → Profile → Followers → member → Back → list → `@mohamad` Profile → hardware Back → SAME Discover-opened Watch (paused `@mohamad`). Header Back from that Watch returns to Discover (`Q3-header-back.png`). Last Profile Back did not oscillate to the list and did not skip Watch to invent a Discover hop. Unrelated own-Profile navigation is not forced to Watch (see own origin).

Evidence: `Q-discover.png`, `Q3-header-back.png`, `U-discover-mohamad-watch.png`, `U-profile.png`, `U-followers.png`, `U-member.png`, `U-back-list.png`, `U-back-profile.png`, `U-back-origin.png`, `discover-origin-log.txt`.

**Own Profile:** `@playreview` Followers/Following were empty at start. Temporary Follow of `@mohamad` (unfollowed after). Own Profile → Following → `@mohamad` → hardware Back → SAME Following list → hardware Back → own Profile `@playreview` (Edit, email visible). Did not land on Watch.

Empty own Followers “No followers yet” + hardware Back also returned to own Profile (`S-back-list.png`).

Evidence: `R-own-profile.png`, `W-own.png`, `W-following.png`, `W-member.png`, `W-back-list.png`, `W-back-own.png`, `W-unfollowed.png`, `own-following-clean-log.txt`.

## Quick regression smoke

- `ANDROID_HARDWARE_BACK = PASS` — used for all list unwind hops; Watch extra Back stays on Watch.
- `HEADER_BACK = PASS` — stacked Profile header is RTL right `[811,110][926,226]` (868,168). Watch header Back is LTR left `[21,95][137,211]` (79,153) and exits Discover-opened Watch to Discover.
- `ONE_ACTIVE_PLAYER = PASS` — one PLAYING plus leftover PAUSED/NONE (`X-watch-smoke-media_session.txt`). Same class as prior remount smoke.
- `NO_AUDIO_OVERLAP = PASS` — never two PLAYING sessions.
- `NO_PROLONGED_LOADING_REGRESSION = PASS` — no 30–60s spinner on these paths. Broad Watch QA not reopened.

## Defects (honest)

| ID | Result | Severity | Shared vs Android-only | Evidence |
|---|---|---|---|---|
| FOLLOWERS_FULL_STACK | PASS | — | Fix under test | `E-back-followers-list.png` … `G-back-watch.png` |
| FOLLOWING_FULL_STACK | PASS | — | Fix under test | `L-back-following-list.png` … `N-back-watch.png` |
| FOLLOW_LIST_PROFILE_OSCILLATION | ABSENT | — | Closed vs 7e5f734 | `H-extra-back-watch.png` |
| WATCH remount on Profile Back | PASS / NOT OBSERVED | — | Preserved | `P-c1-return.png`, `P-c2-return.png` |
| OWN_PROFILE_ORIGIN | PASS | — | Not forced to Watch | `W-back-own.png` |
| HOME_DISCOVER_ORIGIN | PASS | — | Discover card → Watch origin preserved | `U-back-origin.png`, `Q3-header-back.png` |

NEW_DEFECTS = NONE. No source fix applied.

## Security / process

- No secrets printed. No `.env` contents printed.
- No Play Console mutation. No upload. No AAB. No production submit.
- No product source change. No local fix. No commit. No push.
- Temporary Follow `@mohamad` from `@playreview` was reverted to Follow before closeout (`W-unfollowed.png`).
- D:\ not present. Packet in worktree `docs/ops` and web `docs/ops` / `docs/ai` only.

## Next action

`STOP_AND_WAIT_FOR_CENTRAL`.
