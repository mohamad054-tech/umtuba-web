# DESKTOP_ANDROID_DD86A3E_PLAYBACK_FINAL_GATE_V1

## Central final report

```
TASK_ID = DESKTOP_ANDROID_DD86A3E_PLAYBACK_FINAL_GATE_V1
STATUS = COMPLETE
SOURCE_SHA_VERIFIED = YES
SOURCE_SHA = dd86a3e45a80a43dfc0006c400200b48708394a9
BUILD_RESULT = PASS
BUILD_ID = ed2bb44a-49b2-4969-9189-0e52b014719c
BUILD_IDENTIFIER = ed2bb44a
ANDROID_VERSION_CODE = 20
INSTALLED_ON_FOLD6 = YES
COLD_LAUNCH = PASS
WATCH_5_VIDEO_PLAYBACK = PASS
WATCH_10_PLUS_VIDEO_PLAYBACK = PASS
WATCH_20_PLUS_VIDEO_STRESS = PASS
PROLONGED_LOADING_REPRODUCED = NO
PROGRESSIVE_SLOWDOWN = NO
WATCH_REENTRY_PLAYBACK = PASS
BACKGROUND_RETURN_PLAYBACK = PASS
CRASH_FREE = YES
WATCH_HEADER_ARROW = PASS
WATCH_HEADER_ARROW_ONE_TAP_EXIT = YES
DOUBLE_BACK = PASS
FIRST_SYSTEM_BACK = PASS
SECOND_SYSTEM_BACK_WITHIN_1800MS = PASS
VIDEO_HISTORY_STACK_GROWTH = NO
NESTED_PROFILE_BACK = PASS
WATCH_CONTEXT_PRESERVED = YES
LOGIN_PASSWORD_EYE_SANITY = PASS
SIGNUP_PASSWORD_EYE_SANITY = PASS
REFERRAL_FIELD_VISIBLE = NO
PROFILE_SANITY = PASS
SAVED_SANITY = PASS
CREATE_SANITY = PASS
SESSION_SANITY = PASS
GLOBAL_BACK_SANITY = PASS
NEW_DEFECTS = NONE
ANDROID_ONLY_DEFECTS = NONE
LIKELY_SHARED_DEFECTS = NONE
SOURCE_CHANGED_BY_DESKTOP = NO
LOCAL_FIX_ATTEMPTED = NO
GOOGLE_PLAY_UPLOAD = NO
PRODUCTION_SUBMISSION = NO
ANDROID_PLAYBACK_P1_CLOSED = YES
ANDROID_FINAL_DEVICE_GATE = PASS
ANDROID_DEVICE_GATE = PASS
READY_FOR_CENTRAL_FINAL_DECISION = YES
BLOCKERS = NONE
NEXT_ACTION = RETURN_REPORT_TO_CENTRAL_AND_WAIT
OPERATOR_MANUAL_ACTIONS = After auth spot-check the Fold6 session is signed out. Restore @mohamad. Do not route to PC2.
```

## Identity

- Machine: DESKTOP. Device: Galaxy Z Fold6 `RFCX718LVHK` / SM-F956B. Authorized (`adb devices -l` = `device`). Unlocked.
- Detached worktree `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-PLAYBACK-P1-DD86A3E`
- HEAD exactly `dd86a3e45a80a43dfc0006c400200b48708394a9` (`fix(mobile): keep one Android Watch player and stable header elevation.`)
- Ref `origin/central/android-watch-playback-p1-v2`. Base `d989e66` is an ancestor.
- `app.config.ts` `versionCode: 20` / `version: 1.0.0`. Remote EAS Android versionCode stayed **20**. Preview `appBuildVersion` = 20. No store bump. No Play AAB.
- Parent `umtuba-mobile` remains dirty. Prior V17–V20 / social-profile / watch-signup / auth-password trees not reset/discarded.
- Worktree `git status --short` = `?? docs/ops/` only (evidence). `node_modules` junction to V20 (lockfile hash match); not product source.
- Package `com.umtuba.app` `1.0.0` / versionCode **20** after install and after QA (`lastUpdateTime` 2026-08-22 11:16:55).
- Session `@mohamad` / 2.1K UM · Creator intact through Watch / Profile / Create / reentry. Intentional sign-out only for Login/Signup eye + referral spot-check. **Restore @mohamad.**

## Build (preview / device-test only)

- Profile: `preview` / INTERNAL APK
- Reused queued EAS `ed2bb44a-49b2-4969-9189-0e52b014719c` (no second build)
- `gitCommitHash` = `dd86a3e45a80a43dfc0006c400200b48708394a9`
- `appBuildVersion` = `20`
- Artifact: `https://expo.dev/artifacts/eas/7b34vLLfTzgJ3VdqEtoLWEbH9WQ97WsNBMPZuQibDw0.apk`
- Local: `docs/ops/android-playback-p1-dd86a3e-fold6-qa/evidence/build/apk/umtuba-android-preview-ed2bb44a.apk`
- Size `148569152`
- SHA256 `BB707577E2FE3ED97F7081F5EDD54D4C45E31CD4A4EF11B4F2102E7D553F5C58`
- aapt: `versionCode='20' versionName='1.0.0'` targetSdk 36
- `adb -s RFCX718LVHK install -r` Success. No data clear. Overwrote auth APK `c9892a8f` / `d989e66`.

## A — Playback P1 primary gate

Cold launch landed in-app (session `@mohamad`). Watch opened with a ready player.

Five different clips reached playback promptly (clock advanced; poster/spinner did not stick 30–60s):

1. `@marenapost` 10:59 — 1:00/2:00 after ~3s (`02-watch-video1-after-3s.png`)
2. `@mohamad` soccer — 0:01 then 0:09/1:08 (`04`, `05`)
3. `@mohamad` singer — 0:34 → 0:52 → 1:17/2:08 (`07`–`11`)
4. `@mohamad` horse — 0:01/0:37 (`12-swipe-01.png`)
5. `@mohamad` cafe — 0:01/0:40 (`12-swipe-10.png`)

A 3s spinner on swipe-2 (`03-watch-video2.png`, 0:00/0:00) and a later 3s spinner on a short clip were **not** held 30s. No 30–60+ stall. `PROLONGED_LOADING_REPRODUCED = NO`.

20 vertical swipes on folded 968×2376 with ~4.5s settle. Capture at 1/5/10/15/20 all showed advancing clocks (e.g. swipe 20 donkey 0:02/0:18). No small/black frames. Timing stayed ~6s/swipe. Still on Watch after swipe 20. App stayed `com.umtuba.app`. No crash/freeze.

`WATCH_5_VIDEO_PLAYBACK = PASS`. `WATCH_10_PLUS_VIDEO_PLAYBACK = PASS`. `WATCH_20_PLUS_VIDEO_STRESS = PASS`. `PROGRESSIVE_SLOWDOWN = NO`. `CRASH_FREE = YES`.

## B — Reentry / background

Leave Watch via Discover tab (`20-discover-after-leave-watch.png`). Re-enter Watch: playing 0:51/1:00 (`21-watch-reentry.png`). Two more swipes produced full frames.

HOME then `am start` brought the task forward. Watch after return playing 0:14/0:55 (`26-watch-after-background-return.png`).

Transient `Loading Watch...` after a settings deep-link remount recovered within ~6s to 0:29/2:00 (`66-watch-after-loading-wait.png`). Not a 30–60s stall.

`WATCH_REENTRY_PLAYBACK = PASS`. `BACKGROUND_RETURN_PLAYBACK = PASS`.

## C — Watch regression spot-check

- Header arrow one-tap: Watch → Discover (`31-after-header-arrow.png`). App stayed `com.umtuba.app`.
- First system Back: toast `Press Back again to exit Watch`; stayed on Watch (`33-first-system-back-arm.png`).
- Second Back within 643ms: exited Watch to Discover (`37-after-fast-double-back.png`). Not 20 stacked Watch pages.
- After >1800ms, next Back re-armed toast (`40-back-after-timeout-rearm.png`) and did not exit.
- 20 swipes then one Back armed exit. `VIDEO_HISTORY_STACK_GROWTH = NO`.
- Nested `umtuba://profile?u=eman` (`61-eman-profile.png`, Follow / `@eman`) → header Back → Watch same `@marenapost` clip 0:43/2:00 (`70-after-eman-back-100-168.png`). Context preserved.

`WATCH_HEADER_ARROW = PASS`. `DOUBLE_BACK = PASS`. `NESTED_PROFILE_BACK = PASS`. `WATCH_CONTEXT_PRESERVED = YES`.

## D — Auth delta sanity (spot-check only)

Did **not** repeat full Auth QA / Autofill certification.

Login: eye present (struck-through, LTR right end). `Show password` in dump. Dummy `DummyTest1` only; not a real credential. Signup: `Show password` present. Visible fields: Full name / Username / Email / Password + Create account. **No referral/invite row.**

`LOGIN_PASSWORD_EYE_SANITY = PASS`. `SIGNUP_PASSWORD_EYE_SANITY = PASS`. `REFERRAL_FIELD_VISIBLE = NO`.

## E — Minimal product sanity

- Profile tab: `@mohamad`, Edit profile, 24 posts (`52-profile-tab.png`).
- Saved: Watch `Save` control present (a11y `Save`, star count). No separate Saved tab in this SHA.
- Create: Choose video + caption + Terms confirm (`53-create-tab.png`).
- Session `@mohamad` through the product gate. Signed out only for Login/Signup spot-check.
- Global Back: header arrows on Watch / Discover / Profile / eman / Settings all responded.

`PROFILE_SANITY = PASS`. `SAVED_SANITY = PASS`. `CREATE_SANITY = PASS`. `SESSION_SANITY = PASS`. `GLOBAL_BACK_SANITY = PASS`.

## Security / process

- No secrets printed. Dummy password only.
- No Play upload. No production AAB. No commit. No source change.
- `D:\umtuba-central\reports\` not present on this Desktop.

## Evidence

Worktree: `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-PLAYBACK-P1-DD86A3E\docs\ops\android-playback-p1-dd86a3e-fold6-qa\`
Web copy: `C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\android-playback-p1-dd86a3e-fold6-qa\`
