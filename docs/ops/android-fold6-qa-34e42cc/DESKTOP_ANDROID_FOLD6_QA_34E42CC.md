# DESKTOP_ANDROID_FOLD6_QA_34E42CC

Physical Fold6 QA complete. Official fuller Central GO. Slim packet `DESKTOP_ANDROID_34E42CC_FINAL_DEVICE_QA_V1` superseded as CURRENT (same SHA; one preview only). No second EAS build. SOURCE_PATCHED = NO.

## Central final report

```
PACKET = DESKTOP_ANDROID_FOLD6_QA_34E42CC
TASK_ID = DESKTOP_ANDROID_FOLD6_QA_34E42CC
DATE = 2026-08-22
OPERATOR = DESKTOP
DEVICE = Galaxy Z Fold6
AUTHORITATIVE_SHA_REQUIRED = 34e42cc0cdd27a850d5b485d5786c22114531ed8
INSTALLED_SHA = 34e42cc0cdd27a850d5b485d5786c22114531ed8
GIT_REV_PARSE_HEAD = 34e42cc0cdd27a850d5b485d5786c22114531ed8
INSTALL_METHOD = adb install -r existing preview APK d6f30f54 (no second EAS build)
EAS_BUILD_ID = d6f30f54-e81d-4703-a50a-3209007ae4b6
APK_IDENTITY = com.umtuba.app 1.0.0 versionCode 20 SHA256 A384862FBC58F147D4E415DD836D9055BB5A3DD39CD9AFC8A311A87C7C2A694B
APK_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-34E42CC-FINAL-QA\docs\ops\android-fold6-qa-34e42cc\evidence\build\apk\umtuba-android-preview-d6f30f54.apk
APK_SIZE = 148605336
APK_SHA256 = A384862FBC58F147D4E415DD836D9055BB5A3DD39CD9AFC8A311A87C7C2A694B
DEVICE_BASE_APK_SHA256 = A384862FBC58F147D4E415DD836D9055BB5A3DD39CD9AFC8A311A87C7C2A694B
WORKTREE_PATH = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-34E42CC-FINAL-QA
ANDROID_VERSION_CODE = 20
BUILD_RESULT = PASS
INSTALLED_ON_FOLD6 = YES
GOOGLE_PLAY_UPLOAD = NO
PRODUCTION_SUBMISSION = NO
WATCH_NO_PROLONGED_LOAD = PASS
ONE_ACTIVE_PLAYER = PASS
NO_AUDIO_OVERLAP = PASS
SIGNED_URL_403_NOT_BLOCKING = PASS_NO_403_OBSERVED
DOUBLE_BACK_1800MS = PASS
WATCH_PROFILE_BACK = FAIL
FOLLOWERS_OWN_PROFILE = PASS
FOLLOWING_OWN_PROFILE = PASS
FOLLOWERS_OTHER_PROFILE = PASS
FOLLOWING_OTHER_PROFILE = PASS
OWN_PROFILE_FALLBACK = PASS
WATCH_FOLLOW_LIST_NAV_LOCK = FAIL
OWN_PROFILE_FOLLOW_LIST_NAV = PASS
SIGNUP_REFERRAL_ABSENT = PASS
PASSWORD_EYE = PASS
AUTOFILL_METADATA_SMOKE = NOT_OFFERED
FOLD_FOLDED_VISUAL = PASS
FOLD_UNFOLDED_VISUAL = NOT_TESTED_DEVICE_STAYED_FOLDED
WATCH_10_PLUS_PLAYBACK = PASS
WATCH_20_PLUS_STRESS = PASS
PROLONGED_LOADING_REPRODUCED = NO
PROGRESSIVE_SLOWDOWN = NO
WATCH_REENTRY = PASS
PREVIOUS_AUDIO_LEFTOVER = PASS_ONE_NONE_LEFTOVER_NOT_PLAYING
NESTED_WATCH_PROFILE_BACK = FAIL
FOLLOWERS_LIST_OPEN = PASS
FOLLOWING_LIST_OPEN = PASS
PROFILE_SANITY = PASS
CREATE_OPEN_WATCH_REGRESSION = NOT_CONFIRMED
COLD_LAUNCH = PASS
SESSION_PERSISTENCE = PASS_THEN_SIGNED_OUT_FOR_AUTH_QA
NEW_DEFECTS = NONE
SHARED_DEFECTS = NESTED_WATCH_PROFILE_BACK still FAIL on @eman (same class as 0d5680a). Header Back from other-user Profile lands on own Profile tab; system Back stays on @eman. Watch→Profile→Followers/Following→member→Back does not return to Watch. Historical Followers/Following missing-list NOT reproduced — lists open.
SCREENSHOTS = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-34E42CC-FINAL-QA\docs\ops\android-fold6-qa-34e42cc\evidence\qa\
DESKTOP_FINAL_STATUS = FAIL
SOURCE_PATCHED = NO
SOURCE_CHANGED_BY_DESKTOP = NO
CENTRAL_DECISION_REQUIRED = YES
FINAL_DEVICE_VERDICT = FAIL_NESTED_WATCH_PROFILE_BACK
STOP_AND_WAIT_FOR_CENTRAL = YES
D_PATH = ABSENT
```

## Identity

- Machine: DESKTOP. Not PC2. Not iPhone/TestFlight.
- Device: Galaxy Z Fold6 `RFCX718LVHK` / SM-F956B / `com.umtuba.app`. ADB state `device` (authorized, not unauthorized/offline). Operator reported connected/unlocked; screen was woken; app drawer / UMTUBA usable.
- Worktree `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-34E42CC-FINAL-QA`
- `git rev-parse HEAD` = `34e42cc0cdd27a850d5b485d5786c22114531ed8`
- `origin/central/ios-watch-player-lifecycle-stability-v1` = same SHA
- Commit: `fix(mobile): load Profile followers from profile_follows and keep origin Back.`
- Product source CLEAN. Only `?? docs/ops/` (this packet + evidence). `node_modules` junction to V20 after lockfile SHA256 match; gitignored; not product source.
- Parent `C:\Users\1\Desktop\umtuba\umtuba-mobile` remains dirty at `3b33561`. Not reset.
- `app.config.ts` `versionCode: 20` / `version: 1.0.0`. No bump.

## Install / dumpsys

- Reused existing preview `d6f30f54-e81d-4703-a50a-3209007ae4b6`. Did not queue a second EAS build.
- `adb -s RFCX718LVHK install -r` the on-disk APK. Success.
- dumpsys: `versionCode=20` `versionName=1.0.0` `targetSdk=36` `lastUpdateTime` 2026-08-22 18:36:51
- Device `sha256sum` of installed `base.apk` = `a384862fbc58f147d4e415dd836d9055bb5a3dd39cd9afc8a311a87c7c2a694b` — matches disk APK SHA256.
- Folded `wm size` 968x2376 for the entire session. Inner display remained OFF.

## Watch / player

- Cold launch opened Watch (session 2.1K UM · Creator, first clip `@marenapost`).
- After settle: clock ~0:51/2:00. `media_session` one PLAYING + one leftover NONE (not a second playing video). One `com.umtuba.app` audio session.
- 20 swipes: timings avg ~5072 ms (min 5032, max 5110) including settle. No progressive slowdown. Distinct clips (swipe 01 mosaic `@marenapost`; swipe 10 night event `@mohamad` ~0:03/2:15; swipe 20 cattle `@mohamad` ~0:02/0:29). Always 1 PLAYING + 1 NONE.
- No 30–60s prolonged loading. Active video never went disabled.
- No HTTP 403 observed on signed URLs during the 20-swipe run. Active video was not disabled.
- Header arrow: Watch → Discover in one tap (`31-after-header-arrow.png`).
- System Back: first back and back after >1800ms rearm stayed on Watch. Fast double-back exited to Discover (`37-after-fast-double-back.png`).

## Nested Watch → other Profile → Back — FAIL (do not hide)

Same class as 0d5680a. Not fixed on this SHA.

- Deeplink `umtuba://profile?u=eman` opens other-user `@eman` (Follow, 1 Followers / 0 Following / 4 Posts). Not own profile. `OWN_PROFILE_FALLBACK = PASS`.
- Header Back on `@eman` is RTL top-right. Left-side taps miss the control (operator error, not product).
- RTL header Back from `@eman` went to own Profile tab `@mohamad`, not Watch (`72-eman-rtl-header-back.png`).
- System Back from `@eman` stayed on `@eman` across five deeplink iterations (`71-after-eman-system-back-*.png`).
- Repeat Watch/Profile/Back five times: never returned to the same Watch from `@eman`.

**Expected:** one-tap Back from other-user Profile returns to the same Watch.
**Actual:** stay on `@eman` (system Back) or land on own Profile (header Back).
**Severity:** High — Watch origin lock / back-stack residual.
**Shared vs Android-only:** Shared residual (same class as 0d5680a nested Profile Back FAIL). Not independently patched. SOURCE_PATCHED = NO.

## Followers / Following lists — lists OPEN

Historical missing-list defect is **not reproduced** on this SHA. Do not report it as still present.

- Own Profile `@mohamad`: 1 Followers / 1 Following / 24 Posts.
- Own Followers: list opens with `@marenapost` (`81-own-followers.png`). Member tap opens `@marenapost`. Back returns to list (`OWN_PROFILE_FOLLOW_LIST_NAV = PASS`).
- Own Following: list opens with `@khader`. Member tap opens `@khader`. Back returns to list.
- Other `@eman` Followers: list opens with `@marenapost` (`91-eman-followers.png`).
- Other `@eman` Following: list screen opens with empty state “Not following anyone yet” (`97b-eman-following.png`). List **opened**.
- Home → own Profile → Followers/Following → member → Back: own-profile path works (`110`–`114`).

## Watch follow-list nav lock — FAIL

Watch → `@eman` Profile → Followers → member → Back → list → Back → Profile → Back → Watch: backs do **not** return to Watch. Land on own Profile or stay nested (`95-eman-followers-back-watch.png` is own Profile). Same for Following. Same back-stack class as `WATCH_PROFILE_BACK`.

## Auth / Create / fold

- Signed out from native Settings (Edit profile → `/settings` → Sign out confirm) to reach Login. Session restore of `@mohamad` was not performed after auth QA.
- Login: Email + Password + Show password control. Dummy QA string used only. Hidden (dots) then revealed via eye (`192-login-password-hidden.png`, `193-login-password-shown.png`). No real password printed.
- Signup (`umtuba://signup` / Join UMTUBA): Full name, Username, Email, Password, Create account. **No referral field** (`210-signup.png`, `210-signup-nodes.txt`). Show password control present.
- Autofill: email focused on Login; waited; no Samsung Pass / system suggestion UI. `AUTOFILL_METADATA_SMOKE = NOT_OFFERED`.
- Create tab from Watch was not cleanly captured (prior taps landed on leftover Followers stack or left the app). `CREATE_OPEN_WATCH_REGRESSION = NOT_CONFIRMED`. Not invented PASS.
- Folded cover 968×2376: Watch, Profile, lists, Settings, Login, Signup contained. No clip observed. `FOLD_FOLDED_VISUAL = PASS`.
- Device stayed folded the entire session. Inner display OFF. `FOLD_UNFOLDED_VISUAL = NOT_TESTED_DEVICE_STAYED_FOLDED`.

## Defects (honest)

| ID | Result | Severity | Shared vs Android-only | Evidence |
|---|---|---|---|---|
| WATCH_PROFILE_BACK / NESTED_WATCH_PROFILE_BACK | FAIL | High | Shared (0d5680a class) | `61-eman-profile-*.png`, `70-after-eman-header-back-*.png`, `71-after-eman-system-back-*.png`, `72-eman-rtl-header-back.png` |
| WATCH_FOLLOW_LIST_NAV_LOCK | FAIL | High | Shared (same back-stack) | `95-eman-followers-back-watch.png`, `101-eman-following-back-watch.png` |
| Historical Followers/Following missing lists | NOT REPRODUCED | — | — | `81-own-followers.png`, `83-own-following.png`, `91-eman-followers.png`, `97b-eman-following.png` |
| Unfolded inner visual | NOT_TESTED | — | — | `wm size` stayed 968x2376 |

No source fix applied. Do not invent PASS on the nested Back path.

## Screenshots

Worktree evidence (D:\ absent):

`C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-34E42CC-FINAL-QA\docs\ops\android-fold6-qa-34e42cc\evidence\qa\`

Key files: `01-cold-launch.png`, `02-watch-video1-ready.png`, `12-swipe-01.png` / `10` / `20` + `*-media_session.txt`, `swipe-timings.txt`, `31-after-header-arrow.png`, `33-first-system-back-arm.png`, `34-back-after-timeout-rearm.png`, `37-after-fast-double-back.png`, `61-eman-profile-1.png` … `5.png`, `70-after-eman-header-back-*.png`, `71-after-eman-system-back-*.png`, `72-eman-rtl-header-back.png`, `80-own-profile.png`, `81-own-followers.png`, `81b-own-followers-member.png`, `83-own-following.png`, `83b-own-following-member.png`, `91-eman-followers.png`, `91b-eman-followers.png`, `92-eman-followers-member.png`, `97b-eman-following.png`, `95-eman-followers-back-watch.png`, `110-home-own-profile.png`, `141-edit-or-settings.png`, `181-signout-dialog.png`, `190-login.png`, `191-login-email-autofill-wait.png`, `192-login-password-hidden.png`, `193-login-password-shown.png`, `210-signup.png`, `210-signup-nodes.txt`.

Cover screencaps used display id `4630947194243491972` while folded.

## Security / process

- No secrets printed. No `.env` read. No real password printed. Dummy QA string only.
- Accidental notification-shade dump was deleted and is not part of this packet.
- No Play Console mutation. No upload. No AAB. No production submit.
- No product source change. No local fix. No commit. No push.
- D:\ not present (`D:\umtuba-central\FROM-DESKTOP` and `D:\umtuba-central\reports` absent). Packet written to worktree `docs/ops` and web `docs/ops` / `docs/ai` only.

## Open issues

1. `WATCH_PROFILE_BACK` / `NESTED_WATCH_PROFILE_BACK` FAIL on `@eman` (same class as 0d5680a). Central decision required. Do not independently patch.
2. `WATCH_FOLLOW_LIST_NAV_LOCK` FAIL — backs from other-user follow lists do not return to Watch.
3. `FOLD_UNFOLDED_VISUAL` not tested — device stayed folded.
4. Create-from-Watch not cleanly confirmed.
5. Session signed out for Login/Signup QA. Operator must restore signed-in session if further in-app QA is needed.
6. D:\ Central return path absent on this Desktop.

## Next action

`STOP_AND_WAIT_FOR_CENTRAL`.
