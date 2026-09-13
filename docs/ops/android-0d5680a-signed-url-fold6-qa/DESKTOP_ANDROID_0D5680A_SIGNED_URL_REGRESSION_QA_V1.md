# DESKTOP_ANDROID_0D5680A_SIGNED_URL_REGRESSION_QA_V1

## Central final report

```
TASK_ID = DESKTOP_ANDROID_0D5680A_SIGNED_URL_REGRESSION_QA_V1
STATUS = COMPLETE_WITH_NESTED_PROFILE_BACK_FAIL
SOURCE_SHA_VERIFIED = YES
SOURCE_SHA = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
PREVIOUS_ANDROID_GOOD_SHA = dd86a3e45a80a43dfc0006c400200b48708394a9
BUILD_RESULT = PASS
BUILD_ID = fa041da6-e121-47f8-aee8-98f52ea343bc
BUILD_IDENTIFIER = fa041da6
ANDROID_VERSION_CODE = 20
APK_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-0D5680A-SIGNED-URL-QA\docs\ops\android-0d5680a-signed-url-fold6-qa\evidence\build\apk\umtuba-android-preview-fa041da6.apk
APK_SHA256 = C487DDE20ED482808C3F8EC303D620F86722D36E3D7AE06F8C5B4E4BC1512CDC
APK_SIZE = 148583064
WORKTREE_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-0D5680A-SIGNED-URL-QA
INSTALLED_ON_FOLD6 = YES
WATCH_10_PLUS_VIDEO_PLAYBACK = PASS
WATCH_20_PLUS_VIDEO_STRESS = PASS
PROLONGED_LOADING_REPRODUCED = NO
PROGRESSIVE_SLOWDOWN = NO
NEXT10_PREPARATION = PARTIAL
ACTIVE_PLAYER_COUNT = NOT_DIRECTLY_MEASURED
WATCH_REENTRY_PLAYBACK = PASS
BACKGROUND_RETURN_PLAYBACK = PASS
WATCH_HEADER_ARROW = PASS
DOUBLE_BACK = PASS
VIDEO_HISTORY_STACK_GROWTH = NO
NESTED_PROFILE_BACK = FAIL
PASSWORD_EYE_SANITY = NOT_TESTED_SESSION_PRESERVED
PROFILE_SANITY = PASS
SAVED_SANITY = PARTIAL_NO_DEDICATED_TAB
CREATE_SANITY = PASS
SESSION_SANITY = PASS
DD86A3E_PLAYBACK_FIX_PRESERVED = YES
NEW_DEFECTS = Nested @eman Profile does not return to Watch via header Back or Android system Back
ANDROID_ONLY_DEFECTS = NONE_PROVEN
LIKELY_SHARED_DEFECTS = Nested other-user Profile back-stack does not pop to Watch
SOURCE_CHANGED_BY_DESKTOP = NO
LOCAL_FIX_ATTEMPTED = NO
GOOGLE_PLAY_UPLOAD = NO
PRODUCTION_SUBMISSION = NO
ANDROID_FINAL_DEVICE_GATE = PASS_WITH_NESTED_PROFILE_BACK_FAIL
READY_FOR_CENTRAL_FINAL_DECISION = YES
BLOCKERS = NONE
NEXT_ACTION = RETURN_REPORT_TO_CENTRAL_AND_WAIT
```

## Identity

- Machine: DESKTOP. Device: Galaxy Z Fold6 `RFCX718LVHK` / SM-F956B. Authorized (`adb devices -l` = `device`). Folded 968×2376.
- Device was PIN/password locked immediately after install (`Bouncer` / `keyguard_password_view`). Operator later unlocked. QA continued only after launcher was unlocked. No PIN entered by the agent.
- NEW detached worktree `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-0D5680A-SIGNED-URL-QA`
- HEAD exactly `0d5680ad05fbbb988a59de86c2ee2e87f733f970` (`fix(mobile): sign the active Watch URL before the rest of the feed page.`)
- One commit after previous Android good SHA `dd86a3e45a80a43dfc0006c400200b48708394a9`.
- `app.config.ts` `versionCode: 20` / `version: 1.0.0`. Remote EAS Android versionCode stayed **20**. Preview `appBuildVersion` = 20. No store bump. No production AAB.
- Parent `C:\Users\1\Desktop\umtuba\umtuba-mobile` remains dirty (`3b33561` + uncommitted). Prior playback / auth / V17–V20 trees not reset/discarded. Prior playback worktree was not checked out onto this SHA.
- Worktree `git status --short` = `?? docs/ops/` only (evidence + capture helper). `node_modules` junction to V20 (lockfile SHA256 match); not product source.
- Package `com.umtuba.app` `1.0.0` / versionCode **20** after install and after QA (`lastUpdateTime` 2026-08-22 13:34:21). Overwrote expected dd86a3e / ed2bb44a / vc 20.
- Session `@mohamad` / 2.1K UM · Creator intact through Watch / Profile / Create. No sign-out.

## Build (preview / device-test only)

- Profile: `preview` / INTERNAL APK
- First queue attempt failed after upload (`Network error: request to https://api.expo.dev/graphql failed`). Rechecked list: no 0d5680a build existed. One retry queued.
- EAS `fa041da6-e121-47f8-aee8-98f52ea343bc`
- `gitCommitHash` = `0d5680ad05fbbb988a59de86c2ee2e87f733f970`
- `appBuildVersion` = `20`
- Artifact: `https://expo.dev/artifacts/eas/NoPNvZaxZq9-Ej5MQ-lu6YIIyfP_8ZwVw7tIS2N76z0.apk`
- Local: `docs/ops/android-0d5680a-signed-url-fold6-qa/evidence/build/apk/umtuba-android-preview-fa041da6.apk`
- Size `148583064`
- SHA256 `C487DDE20ED482808C3F8EC303D620F86722D36E3D7AE06F8C5B4E4BC1512CDC`
- aapt: `package: name='com.umtuba.app' versionCode='20' versionName='1.0.0'` targetSdk 36
- `adb -s RFCX718LVHK install -r` Success. No data clear.
- No second EAS build after `fa041da6` started. No production AAB.

## A — Targeted Watch signed-URL / playback regression

Cold launch (`am force-stop` then `am start`) landed in-app on Watch with session `@mohamad`. First clip `@marenapost` playing 0:03/2:00 (`01-cold-launch.png`). Next capture already `@mohamad` highway 0:07/0:40 (`02-watch-video1-ready.png`). Prompt playback. No 30–60s spinner.

20 vertical swipes on folded 968×2376 with ~4.5s settle. Capture at 1/5/10/15/20 all showed distinct playing clips with advancing clocks:

1. swipe 01 boxing `@mohamad` 0:03/1:38 (`12-swipe-01.png`)
5. swipe 05 heritage `@mohamad` 0:03/0:56 (`12-swipe-05.png`)
10. swipe 10 sidewalk/dog `@mohamad` 0:03/1:11 (`12-swipe-10.png`)
15. swipe 15 field/emojis `@mohamad` 0:03/0:38 (`12-swipe-15.png`)
20. swipe 20 courtyard animals `@mohamad` 0:03/0:12 (`12-swipe-20.png`)

Swipe loop timing: n=20, min 5013 ms, max 5124 ms, average 5063.5 ms (`swipe-timings.txt`). No progressive slowdown. Still `com.umtuba.app` / Watch after swipe 20. No crash. No 30–60s stall.

Current video was not blocked while later feed rows signed. After each settle the clock was already ~0:03, not stuck at 0:00/0:00.

`WATCH_10_PLUS_VIDEO_PLAYBACK = PASS`. `WATCH_20_PLUS_VIDEO_STRESS = PASS`. `PROLONGED_LOADING_REPRODUCED = NO`. `PROGRESSIVE_SLOWDOWN = NO`. `DD86A3E_PLAYBACK_FIX_PRESERVED = YES`.

### NEXT10_PREPARATION

User-visible transitions were prompt and stable versus dd86a3e (~6s/swipe with the same 4.5s settle). Current clip kept playing; future-row signing did not stall the active video.

The next-10 signed-URL scheduler itself has no on-device indicator. Not directly observed.

`NEXT10_PREPARATION = PARTIAL`.

### ACTIVE_PLAYER_COUNT

Native player objects were not counted reliably (no stacked TextureView list; SurfaceFlinger showed one MainActivity surface).

Supporting observations during the 20-swipe Watch stress:

- `dumpsys media_session`: one `PLAYING` state for `com.umtuba.app` before swipes (position ~18s) and after swipe 20 (position ~2.9s). One leftover `NONE` session.
- `dumpsys media.audio_flinger`: one `com.umtuba.app` session.
- Only one video visible/audible. No stacked full-screen players. No resource exhaustion.

After later Profile/Create hops, `dumpsys media_session` showed **1 PLAYING + 2 PAUSED** sessions. That is not a hard native-player count of 1 for the whole session. Do not invent `1`.

`ACTIVE_PLAYER_COUNT = NOT_DIRECTLY_MEASURED`.

## B — Reentry / background

Leave Watch via Discover tab (`20-discover-after-leave-watch.png`, Discover loading then content). Re-enter Watch: playing `@mohamad` 0:36/1:33 (`21-watch-reentry.png`). Two more swipes produced full frames.

HOME then `am start` brought the task forward (`Activity not started, its current task has been brought to the front`). After return: Watch clip loaded; `media_session` `PLAYING` position 3040 ms (`25-watch-after-background-return.png` captured a short 0:00/0:08 frame at the start of that clip). Not a 30–60s stall.

`WATCH_REENTRY_PLAYBACK = PASS`. `BACKGROUND_RETURN_PLAYBACK = PASS`.

## C — Watch navigation

- Header arrow one-tap: Watch → Discover (`31-after-header-arrow.png`). App stayed `com.umtuba.app`.
- First system Back: toast `Press Back again to exit Watch`; stayed on Watch (`33-first-system-back-arm.png`).
- Fast double-back 770 ms: exited Watch to Discover (`37-after-fast-double-back.png`). Not 20 stacked Watch pages.
- After >1800 ms, next Back stayed on Watch playing 0:05/0:18 (`40-back-after-timeout-rearm.png`) and did not exit.
- 20 swipes then one Back armed exit. `VIDEO_HISTORY_STACK_GROWTH = NO`.

`WATCH_HEADER_ARROW = PASS`. `DOUBLE_BACK = PASS`.

### Nested Profile back — FAIL

`umtuba://profile?u=eman` opened other-user Profile `@eman` / Follow / 4 Posts (`61-eman-profile.png`, `65-eman-final.png`).

Header Back did **not** return to Watch:

- First tap ~48,170 stayed on `@eman` (`70-after-eman-back.png`)
- System Back stayed on `@eman` (`71-after-eman-system-back.png`)
- Retry at documented Back control center 58,179 stayed on `@eman` (`76-after-eman-back-58-179.png`)

Watch tab still reachable and played (`91-watch-final.png` `@eman` 0:06/2:00). Own Profile tab still `@mohamad`. This is a back-stack residual, not a Watch playback stall.

`NESTED_PROFILE_BACK = FAIL`.

## D — Minimal sanity (spot only; no Auth/Autofill recert)

- Session `@mohamad` / 2.1K UM · Creator throughout. Own Profile: `mohamad abu tair` / `@mohamad` / Edit profile / 24 Posts (`75-own-profile.png`). `SESSION_SANITY = PASS`.
- Password eye: **not** opened. Session was already `@mohamad`. GO said prefer not to sign out. `PASSWORD_EYE_SANITY = NOT_TESTED_SESSION_PRESERVED`.
- Create: Choose video + caption 0/1000 + Terms checkbox (`82-create-from-watch.png`). `CREATE_SANITY = PASS`.
- Saved: no dedicated Saved tab on this 6-tab bar (Watch / Discover / Create / Live / Messages / Profile). Watch star control present. `SAVED_SANITY = PARTIAL_NO_DEDICATED_TAB`.
- Live lobby unavailable is expected / out of this GO.

## E — Security / process

- No secrets printed. No `.env` read. No Play Console mutation. No upload. No production submit.
- No product source change. No local fix. No commit. No push. Dirty parent preserved.
- First EAS queue failed on GraphQL after upload; one preview retry only. Credits were 86% then 91% — recorded, not acted on beyond this authorized preview.
- `D:\umtuba-central\reports\` not present on this Desktop.

## Open issues

1. Nested `@eman` Profile does not pop to Watch via header Back or system Back. Observed on this SHA. Prior dd86a3e packet recorded PASS for the same deeplink. Central should decide if this is a shared back-stack regression or a Fold6 hit-test residual. Agent did not fix.
2. `ACTIVE_PLAYER_COUNT` cannot be a hard native integer. Extra `PAUSED` media sessions appeared after later tab hops.
3. Password-eye sanity skipped to keep `@mohamad`.

## Recovery confirmation (continuation after 7f0c8e16)

Parent believed 7f0c8e16 died mid-task. Recovered existing worktree/APK/packet instead of starting over. No second EAS build. No reinstall. Full 20-video suite not re-run. Verdicts above unchanged.

- Worktree HEAD still `0d5680ad05fbbb988a59de86c2ee2e87f733f970`
- APK still present, size `148583064`, SHA256 `C487DDE20ED482808C3F8EC303D620F86722D36E3D7AE06F8C5B4E4BC1512CDC`
- Fold6 `RFCX718LVHK` authorized and unlocked at 2026-08-22 14:58 +03
- dumpsys still `com.umtuba.app` `1.0.0` / versionCode **20**, `lastUpdateTime` 2026-08-22 13:34:21
- App focused: `com.umtuba.app/.MainActivity`
- 40 QA PNGs still on disk (cold launch Watch `@marenapost` 0:03/2:00; swipe 01 boxing; swipe 10 sidewalk/dog; swipe 20 courtyard animals; reentry playing 0:36/1:33; double-back toast; `@eman` still on Profile after header Back)
- Recovery media_session showed **3 PAUSED** `com.umtuba.app` sessions. Still `ACTIVE_PLAYER_COUNT = NOT_DIRECTLY_MEASURED`
- Evidence: `evidence/install/post-recovery-dumpsys.txt`
